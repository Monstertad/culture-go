import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import OpenAI from 'openai'

admin.initializeApp()

// ─────────────────────────────────────────────────────────────
// 환경변수 설정 방법
//   로컬:  functions/.env 에 작성 후 firebase emulators:start
//   배포:  firebase functions:secrets:set OPENAI_API_KEY
//          firebase functions:secrets:set REMOVE_BG_API_KEY
// ─────────────────────────────────────────────────────────────
function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY // ← 직접 입력 금지
  if (!apiKey) throw new HttpsError('internal', 'OPENAI_API_KEY가 설정되지 않았습니다.')
  return new OpenAI({ apiKey })
}

interface GenerateInput {
  shopId:   string
  shopName: string
  category: string
  lat:      number
  lng:      number
  menu:     string   // 대표 메뉴
  feature:  string   // 가게 특징
  keyword:  string   // 키워드
}

interface MonsterSettings {
  name:        string
  description: string
  attribute:   string
  rarity:      'common' | 'rare' | 'epic' | 'legendary'
  imagePrompt: string
}

// ─── Step 1. GPT — 몬스터 설정 텍스트 생성 ──────────────────
async function generateSettings(
  openai: OpenAI,
  input: GenerateInput
): Promise<MonsterSettings> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4.1-mini', // ← 텍스트 생성 모델
    max_tokens: 400,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          '너는 충청도 로컬 AR 게임 "컬쳐GO"의 몬스터 디자이너야. 가게 특성을 분석해 귀여운 게임 몬스터를 설계해. JSON만 응답해.',
      },
      {
        role: 'user',
        content: `가게명: ${input.shopName}
카테고리: ${input.category}
대표 메뉴: ${input.menu}
특징: ${input.feature}
키워드: ${input.keyword}

아래 JSON 형식으로 몬스터를 만들어줘:
{
  "name": "한국어 몬스터 이름",
  "description": "몬스터 특징 1-2문장 (귀엽고 지역 감성)",
  "attribute": "속성 (불/물/빵/전통/매운맛/달콤 중 하나)",
  "rarity": "common | rare | epic | legendary",
  "imagePrompt": "영어 이미지 프롬프트 (cute chibi game monster, ${input.category} theme, white solid background, game card art style, vibrant colors)"
}`,
      },
    ],
  })
  return JSON.parse(res.choices[0].message.content ?? '{}') as MonsterSettings
}

// ─── Step 2. gpt-image-1 — 몬스터 이미지 생성 ──────────────
async function generateImage(openai: OpenAI, prompt: string): Promise<string> {
  const res = await openai.images.generate({
    model: 'gpt-image-1', // ← 이미지 생성 모델
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'low', // low / medium / high — 데모: low (빠르고 저렴)
  })
  const b64 = res.data[0].b64_json
  if (!b64) throw new HttpsError('internal', '이미지 생성 응답이 비어있습니다.')
  return b64
}

// ─── Step 3. remove.bg — 배경 제거 (누끼) ───────────────────
async function removeBg(b64Image: string): Promise<string> {
  const apiKey = process.env.REMOVE_BG_API_KEY // ← 직접 입력 금지
  if (!apiKey) {
    // API 키 없으면 누끼 생략 후 원본 반환 (개발 환경 fallback)
    console.warn('[removeBg] REMOVE_BG_API_KEY 없음 — 누끼 생략')
    return b64Image
  }

  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_base64: b64Image,
      size: 'auto',
      format: 'png', // 투명 배경 PNG
    }),
  })

  if (!res.ok) {
    const msg = await res.text()
    throw new HttpsError('internal', `remove.bg 오류: ${res.status} ${msg}`)
  }

  // 응답은 binary PNG → base64 변환
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer).toString('base64')
}

// ─── Step 4. Firebase Storage — 이미지 업로드 ───────────────
async function uploadImage(monsterId: string, b64Png: string): Promise<string> {
  const bucket   = admin.storage().bucket()
  const filePath = `monster-images/${monsterId}.png`
  const file     = bucket.file(filePath)
  const buffer   = Buffer.from(b64Png, 'base64')

  await file.save(buffer, {
    metadata: { contentType: 'image/png' },
    public: true,
  })

  return `https://storage.googleapis.com/${bucket.name}/${filePath}`
}

// ─── 메인 Cloud Function ─────────────────────────────────────
export const generateMonster = onCall(
  {
    timeoutSeconds: 300, // 이미지 생성 + 누끼 최대 5분
    memory: '512MiB',
    // secrets: ['OPENAI_API_KEY', 'REMOVE_BG_API_KEY'], // 프로덕션 배포 시 주석 해제
  },
  async (request) => {
    const input = request.data as GenerateInput
    if (!input.shopId || !input.shopName || !input.menu) {
      throw new HttpsError('invalid-argument', '필수 파라미터가 없습니다.')
    }

    const openai    = getOpenAI()
    const monsterId = `monster_${Date.now()}`

    // 1. GPT 텍스트 생성
    const settings = await generateSettings(openai, input)

    // 2. 이미지 생성
    const rawB64 = await generateImage(openai, settings.imagePrompt)

    // 3. 배경 제거 (누끼)
    const cleanB64 = await removeBg(rawB64)

    // 4. Storage 업로드
    const imageUrl = await uploadImage(monsterId, cleanB64)

    // 5. Firestore 저장
    const monsterData = {
      shopId:      input.shopId,
      name:        settings.name,
      category:    input.category,
      description: settings.description,
      attribute:   settings.attribute,
      rarity:      settings.rarity,
      imageUrl,
      lat: parseFloat(input.lat.toFixed(6)),
      lng: parseFloat(input.lng.toFixed(6)),
      status: 'approved', // 데모: 즉시 승인 → 유저 지도에 바로 반영
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }
    await admin.firestore().collection('monsters').doc(monsterId).set(monsterData)

    return { id: monsterId, ...monsterData }
  }
)
