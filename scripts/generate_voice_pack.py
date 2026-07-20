import asyncio
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1] / "assets" / "audio" / "voice"
KO_VOICE = "ko-KR-SunHiNeural"
EN_VOICE = "en-GB-SoniaNeural"

KO_PROMPTS = {
    "prompt-count": "블록이 몇 개일까요?",
    "prompt-add": "두 친구가 합치면 몇이 될까요?",
    "prompt-sub": "큰 수에서 작은 수를 빼면 몇이 될까요?",
    "prompt-mul": "블록판에는 모두 몇 개가 있을까요?",
}
EN_PROMPTS = {
    "prompt-sub": "What do you get when you take the smaller number away from the larger number?",
}
KO_ONES = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"]
EN_ONES = [
    "", "one", "two", "three", "four", "five", "six", "seven",
    "eight", "nine", "ten", "eleven", "twelve", "thirteen",
    "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
    "nineteen",
]
EN_TENS = [
    "", "", "twenty", "thirty", "forty", "fifty", "sixty",
    "seventy", "eighty", "ninety",
]


def korean_number(number):
    if number == 100:
        return "백!"
    if number > 100:
        return f"백{korean_number(number - 100)[:-1]}!"
    tens, ones = divmod(number, 10)
    if tens == 0:
        return f"{KO_ONES[ones]}!"
    prefix = "" if tens == 1 else KO_ONES[tens]
    return f"{prefix}십{KO_ONES[ones]}!"


def english_number(number):
    if number == 100:
        return "One hundred!"
    if number > 100:
        return f"One hundred and {english_number(number - 100)[:-1].lower()}!"
    if number < 20:
        return f"{EN_ONES[number].capitalize()}!"
    tens, ones = divmod(number, 10)
    phrase = (
        EN_TENS[tens]
        if ones == 0
        else f"{EN_TENS[tens]}-{EN_ONES[ones]}"
    )
    return f"{phrase.capitalize()}!"


KO_NUMBERS = {
    f"number-{number}": korean_number(number)
    for number in range(1, 151)
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
    f"number-{number}": english_number(number)
    for number in range(1, 151)
}


async def render_pack(lang, lines, voice, rate, pitch):
    output = ROOT / lang
    output.mkdir(parents=True, exist_ok=True)
    for name, text in lines.items():
        target = output / f"{name}.mp3"
        if target.exists() and target.stat().st_size > 1024:
            print(f"skip {target.relative_to(ROOT.parent)}")
            continue
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
    await render_pack("en", EN_PROMPTS, EN_VOICE, "-4%", "+0Hz")
    await render_pack("en", EN, EN_VOICE, "+4%", "+7Hz")


if __name__ == "__main__":
    asyncio.run(main())
