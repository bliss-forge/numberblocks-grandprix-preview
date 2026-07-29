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
KO_SAFETY = {
    "safety-next-2": "두 친구를 만나러 어린이집으로 가 볼까요?",
    "safety-next-3": "이번에는 세 친구가 있는 상가로 가요.",
    "safety-next-4": "네 친구가 길가에서 기다리고 있어요.",
    "safety-next-5": "다섯 친구를 만나러 공원으로 가요.",
    "safety-next-6": "여섯 친구가 버스 정류장에서 기다려요.",
    "safety-next-7": "일곱 친구를 만나러 도서관으로 가요.",
    "safety-next-8": "여덟 친구를 만나러 안전한 길로 돌아가요.",
    "safety-next-9": "아홉 친구가 횡단보도 근처에 있어요.",
    "safety-next-10": "열 친구를 만나러 학교 앞으로 가요.",
    "safety-red-light": "빨간불이에요. 초록불이 될 때까지 기다려요!",
    "safety-manhole": "열린 맨홀이에요. 가까이 가지 말고 돌아가요!",
    "safety-construction": "공사 중이에요. 안전 울타리 밖으로 돌아가요!",
    "safety-scooter": "길에 놓인 킥보드예요. 부딪히지 않게 돌아가요!",
    "safety-bicycle": "자전거가 지나가요. 멈추고 지나간 뒤 움직여요!",
    "safety-car": "자동차가 지나가요. 안전한 곳에서 기다려요!",
    "safety-wrong-order": "반가운 친구예요. 하지만 순서대로 만나러 가요!",
    "safety-finish": "친구들을 모두 만났어요! 안전하게 도착했어요!",
    "safety-look-both": "멈춰요, 왼쪽 오른쪽을 봐요!",
    "safety-tour": "학교까지 안전하게 가 보자!",
}
EN_SAFETY = {
    "safety-next-2": "Let's visit Numberblock Two at the nursery.",
    "safety-next-3": "Now let's find Numberblock Three by the shops.",
    "safety-next-4": "Numberblock Four is waiting beside the road.",
    "safety-next-5": "Let's visit Numberblock Five in the park.",
    "safety-next-6": "Numberblock Six is waiting at the bus stop.",
    "safety-next-7": "Let's find Numberblock Seven at the library.",
    "safety-next-8": "Let's take the safe way to Numberblock Eight.",
    "safety-next-9": "Numberblock Nine is near the crossing.",
    "safety-next-10": "Let's find Numberblock Ten by the school.",
    "safety-red-light": "The light is red. Wait until it turns green!",
    "safety-manhole": "That manhole is open. Keep away and go around it!",
    "safety-construction": "There are roadworks ahead. Stay outside the safety barrier!",
    "safety-scooter": "There is a scooter in the way. Go around it carefully!",
    "safety-bicycle": "A bicycle is passing. Stop, wait, and then move!",
    "safety-car": "A car is passing. Wait somewhere safe!",
    "safety-wrong-order": "Hello, friend! Let's meet everyone in number order.",
    "safety-finish": "We met all our friends and arrived safely!",
    "safety-look-both": "Stop! Look left and right!",
    "safety-tour": "Let's walk safely to school!",
}
KO_SRT = {
    "srt-arrive": "수서역에 도착하였어요!",
    "srt-board": "SRT를 타고 할아버지 할머니댁에 가요!",
    "srt-seat": "내 자리를 찾아 앉아보아요!",
    "srt-wrong-seat": "여기는 내 자리가 아니에요. 자리 번호를 다시 봐요!",
    "srt-depart": "좌석을 찾았어요! 출발합니다. 부산역에서 내려요!",
    "srt-station-dongtan": "동탄역이에요. 우리가 내릴 역인지 확인해요!",
    "srt-station-daejeon": "대전역이에요. 우리가 내릴 역인지 확인해요!",
    "srt-station-daegu": "대구역이에요. 우리가 내릴 역인지 확인해요!",
    "srt-station-busan": "부산역이에요! 여기서 내려요!",
    "srt-wrong-station": "해당 역이 아니에요. 다시 기차에 올라타야 해요!",
    "srt-parking": "할아버지 할머니 차를 찾아보아요. 그림자 모양과 번호가 같은 차예요!",
    "srt-wrong-car": "이 차가 아니에요. 모양과 번호판을 다시 봐요!",
    "srt-grandparents": "할아버지 할머니를 만났어요! 정말 잘했어요!",
}
EN_SRT = {
    "srt-arrive": "We have arrived at Suseo Station!",
    "srt-board": "Let's ride the SRT to Grandma and Grandpa's house!",
    "srt-seat": "Let's find my seat and sit down!",
    "srt-wrong-seat": "This is not my seat. Check the seat number again!",
    "srt-depart": "We found our seat! Off we go. We get off at Busan Station!",
    "srt-station-dongtan": "This is Dongtan Station. Is this our stop?",
    "srt-station-daejeon": "This is Daejeon Station. Is this our stop?",
    "srt-station-daegu": "This is Daegu Station. Is this our stop?",
    "srt-station-busan": "This is Busan Station! Time to get off!",
    "srt-wrong-station": "This is not our station. Hop back on the train!",
    "srt-parking": "Let's find Grandma and Grandpa's car. Match the shadow and the number plate!",
    "srt-wrong-car": "That is not the car. Look at the shape and the number plate again!",
    "srt-grandparents": "We met Grandma and Grandpa! Well done!",
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
    await render_pack("ko", KO_SAFETY, KO_VOICE, "-5%", "+2Hz")
    await render_pack("ko", KO_SRT, KO_VOICE, "-5%", "+2Hz")
    await render_pack("en", EN_PROMPTS, EN_VOICE, "-4%", "+0Hz")
    await render_pack("en", EN_SAFETY, EN_VOICE, "-5%", "+2Hz")
    await render_pack("en", EN_SRT, EN_VOICE, "-5%", "+2Hz")
    await render_pack("en", EN, EN_VOICE, "+4%", "+7Hz")


if __name__ == "__main__":
    asyncio.run(main())
