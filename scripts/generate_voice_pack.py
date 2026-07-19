import asyncio
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1] / "assets" / "audio" / "voice"
KO_VOICE = "ko-KR-SunHiNeural"
EN_VOICE = "en-GB-SoniaNeural"

KO_PROMPTS = {
    "prompt-count": "블록이 몇 개일까요?",
    "prompt-add": "두 친구가 합치면 몇이 될까요?",
    "prompt-mul": "블록판에는 모두 몇 개가 있을까요?",
}
KO_NUMBERS = {
    "number-1": "하나!", "number-2": "둘!", "number-3": "셋!",
    "number-4": "넷!", "number-5": "다섯!", "number-6": "여섯!",
    "number-7": "일곱!", "number-8": "여덟!", "number-9": "아홉!",
    "number-10": "열!",
}
KO_CHEERS = {
    "cheer-1": "참 잘했어요!", "cheer-2": "대단해요!",
    "cheer-3": "정답이에요!", "cheer-4": "멋지게 해냈어요!",
}
KO_RETRIES = {
    "retry-1": "괜찮아, 다시 해 봐요.",
    "retry-2": "천천히 생각해 볼까요?",
    "retry-3": "블록을 같이 세어 봐요.",
}
EN = {
    "number-1": "One!", "number-2": "Two!", "number-3": "Three!",
    "number-4": "Four!", "number-5": "Five!", "number-6": "Six!",
    "number-7": "Seven!", "number-8": "Eight!", "number-9": "Nine!",
    "number-10": "Ten!",
}


async def render_pack(lang, lines, voice, rate, pitch):
    output = ROOT / lang
    output.mkdir(parents=True, exist_ok=True)
    for name, text in lines.items():
        target = output / f"{name}.mp3"
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await communicate.save(str(target))
        print(target.relative_to(ROOT.parent))


async def main():
    # Mild adjustments keep the neural Korean voice natural rather than caricatured:
    # prompts are calm, number answers have a bright lift, praise is warm, and retries
    # slow down slightly so they remain encouraging.
    await render_pack("ko", KO_PROMPTS, KO_VOICE, "-4%", "+0Hz")
    await render_pack("ko", KO_NUMBERS, KO_VOICE, "+5%", "+7Hz")
    await render_pack("ko", KO_CHEERS, KO_VOICE, "+3%", "+4Hz")
    await render_pack("ko", KO_RETRIES, KO_VOICE, "-8%", "-2Hz")
    await render_pack("en", EN, EN_VOICE, "+4%", "+7Hz")


if __name__ == "__main__":
    asyncio.run(main())
