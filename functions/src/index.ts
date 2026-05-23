import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import OpenAI from 'openai'

admin.initializeApp()

// ─────────────────────────────────────────────
// OpenAI 클라이언트
// 배포 전 Firebase Secret 등록:
//   firebase functions:secrets:set OPENAI_API_KEY
// 로컬 테스트: functions/.env 파일에 OPENAI_API_KEY=sk-proj-... 작성
// ─────────────────────────────────────────────
function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY // ← 여기에 직접 키 넣지 말 것
  if (!apiKey) throw new HttpsError('internal', 'OPENAI_API_KEY가 설정되지 않았습니다.')
  return new OpenAI({ apiKey })
}

interface GenerateMonsterInput {
  shopId: string
  shopName: string
  category: string
  lat: number
  lng: number
}

interface MonsterSettings {
  name: string
  description: string
  attribute: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  imagePrompt: string
}

// ─────────────────────────────────────────────
// Step 1: GPT로 몬스터 설정 생성
// ─────────────────────────────────────────────
async function generateMonsterSettings(
  openai: OpenAI,
  shopName: string,
  category: string
): Promise<MonsterSettings> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4.1-mini', // ← 텍스트 생성 모델
    max_tokens: 400,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: '너는 충청도 로컬 AR 게임 "컬쳐GO"의 몬스터 디자이너야. 요청받은 가게 정보로 귀여운 게임 몬스터를 설계해. 반드시 JSON만 응답해.',
      },
      {
        role: 'user',
        content: `가게명: ${shopName}
카테고리: ${category}

아래 JSON 형식으로 몬스터를 만들어줘:
{
  "name": "한국어 몬스터 이름 (예: 튀소용, 밤비노)",
  "description": "몬스터 특징 1-2문장 (귀엽고 지역 감성)",
  "attribute": "속성 (불/물/빵/전통/매운맛/달콤 중 하나)",
  "rarity": "common | rare | epic | legendary",
  "imagePrompt": "영어로 된 이미지 생성 프롬프트 (cute chibi game character, korean local ${category} theme, simple background, vibrant colors, game card art style)"
}`,
      },
    ],
  })

  const text = res.choices[0].message.content ?? '{}'
  return JSON.parse(text) as MonsterSettings
}

// ─────────────────────────────────────────────
// Step 2: gpt-image-1 으로 몬스터 이미지 생성
// ─────────────────────────────────────────────
async function generateMonsterImage(
  openai: OpenAI,
  imagePrompt: string
): Promise<string> {
  const res = await openai.images.generate({
    model: 'gpt-image-1', // ← 이미지 생성 모델
    prompt: imagePrompt,
    n: 1,
    size: '1024x1024',
    quality: 'low', // low / medium / high — 데모는 low (빠르고 저렴)
  })

  // gpt-image-1 은 b64_json 으로 반환
  const b64 = res.data[0].b64_json
  if (!b64) throw new HttpsError('internal', '이미지 생성 응답이 비어있습니다.')
  return b64
}

// ─────────────────────────────────────────────
// Step 3: Firebase Storage 에 이미지 업로드
// ─────────────────────────────────────────────
async function uploadMonsterImage(
  monsterId: string,
  b64Image: string
): Promise<string> {
  const bucket = admin.storage().bucket()
  const filePath = `monster-images/${monsterId}.png`
  const file = bucket.file(filePath)
  const buffer = Buffer.from(b64Image, 'base64')

  await file.save(buffer, {
    metadata: { contentType: 'image/png' },
    public: true, // 공개 URL 허용
  })

  // 공개 URL
  return `https://storage.googleapis.com/${bucket.name}/${filePath}`
}

// ─────────────────────────────────────────────
// 메인 Cloud Function
// 프론트에서: httpsCallable(functions, 'generateMonster')
// ─────────────────────────────────────────────
export const generateMonster = onCall(
  {
    timeoutSeconds: 300, // 이미지 생성 최대 5분 허용
    memory: '512MiB',
    // secrets: ['OPENAI_API_KEY'], // 프로덕션 배포 시 주석 해제
  },
  async (request) => {
    const { shopId, shopName, category, lat, lng } =
      request.data as GenerateMonsterInput

    if (!shopId || !shopName || !category) {
      throw new HttpsError('invalid-argument', '필수 파라미터가 없습니다.')
    }

    const openai = getOpenAI()
    const monsterId = `monster_${Date.now()}`

    // 1단계: 텍스트 AI — 몬스터 설정 생성
    const settings = await generateMonsterSettings(openai, shopName, category)

    // 2단계: 이미지 AI — 몬스터 이미지 생성
    const b64Image = await generateMonsterImage(openai, settings.imagePrompt)

    // 3단계: Firebase Storage 업로드
    const imageUrl = await uploadMonsterImage(monsterId, b64Image)

    // 4단계: Firestore 저장
    const monsterData = {
      shopId,
      name: settings.name,
      category,
      description: settings.description,
      attribute: settings.attribute,
      rarity: settings.rarity,
      imageUrl,
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      status: 'approved', // 데모: 즉시 승인 → 유저 지도에 바로 반영
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    await admin.firestore().collection('monsters').doc(monsterId).set(monsterData)

    return { id: monsterId, ...monsterData }
  }
)
