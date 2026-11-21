#!/usr/bin/env python3
"""Generate neural narration, word-timed captions, original music, and the script."""

from __future__ import annotations

import asyncio
import json
import math
import os
import re
import struct
import subprocess
import wave
from pathlib import Path
from typing import Any

import edge_tts

ROOT = Path(__file__).resolve().parents[2]
CODE = ROOT / "_Code"
PUBLIC = CODE / "public"
AUDIO = PUBLIC / "audio"
CONTENT = json.loads((CODE / "src" / "content.json").read_text())
FPS = CONTENT["fps"]
VOICE = os.environ.get("M3_TTS_VOICE", "en-US-AvaNeural")
RATE = os.environ.get("M3_TTS_RATE", "+14%")
SAMPLE_RATE = 22050


def run(command: list[str]) -> str:
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return result.stdout


def to_srt_time(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    secs, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{milliseconds:03}"


def normalized_word(word: str) -> str:
    return re.sub(r"[^\w']", "", word).casefold()


def align_words(
    source_words: list[str], boundaries: list[dict[str, Any]], scene_id: str
) -> list[dict[str, Any]]:
    aligned: list[dict[str, Any]] = []
    source_index = 0
    boundary_index = 0

    while source_index < len(source_words) and boundary_index < len(boundaries):
        source_start = source_index
        boundary_start = boundary_index
        source_text = normalized_word(source_words[source_index])
        boundary_text = normalized_word(boundaries[boundary_index]["text"])

        while source_text != boundary_text:
            if source_text.startswith(boundary_text):
                boundary_index += 1
                if boundary_index >= len(boundaries):
                    break
                boundary_text += normalized_word(boundaries[boundary_index]["text"])
            elif boundary_text.startswith(source_text):
                source_index += 1
                if source_index >= len(source_words):
                    break
                source_text += normalized_word(source_words[source_index])
            else:
                raise RuntimeError(
                    f"Subtitle alignment mismatch in {scene_id}: "
                    f"{source_words[source_start:source_index + 1]!r} does not match "
                    f"{[b['text'] for b in boundaries[boundary_start:boundary_index + 1]]!r}."
                )

        if source_text != boundary_text:
            break
        source_index += 1
        boundary_index += 1
        aligned.append(
            {
                "words": source_words[source_start:source_index],
                "first": boundaries[boundary_start],
                "last": boundaries[boundary_index - 1],
            }
        )

    if source_index != len(source_words) or boundary_index != len(boundaries):
        raise RuntimeError(
            f"Subtitle alignment mismatch in {scene_id}: "
            f"aligned {source_index}/{len(source_words)} script words and "
            f"{boundary_index}/{len(boundaries)} TTS boundaries."
        )
    return aligned


def duration_seconds(path: Path) -> float:
    output = run(["afinfo", str(path)])
    match = re.search(r"estimated duration:\s*([0-9.]+)", output)
    if match is None:
        raise RuntimeError(f"Could not read audio duration for {path}")
    return float(match.group(1))


async def synthesize_scene(scene: dict[str, Any], index: int) -> list[dict[str, Any]]:
    transcript = " ".join(scene["narration"])
    source_words = transcript.split()
    output_path = AUDIO / f"narration_{index}.mp3"
    audio_bytes = bytearray()
    word_boundaries: list[dict[str, Any]] = []
    speaker = edge_tts.Communicate(
        transcript,
        voice=VOICE,
        rate=RATE,
        boundary="WordBoundary",
    )
    async for event in speaker.stream():
        if event["type"] == "audio":
            audio_bytes.extend(event["data"])
        elif event["type"] == "WordBoundary":
            word_boundaries.append(event)

    if not audio_bytes or not word_boundaries:
        raise RuntimeError(f"Edge TTS returned no narration or timing data for {scene['id']}")
    aligned_words = align_words(source_words, word_boundaries, scene["id"])

    output_path.write_bytes(audio_bytes)
    scene_frames = scene["duration"]
    audio_duration = duration_seconds(output_path)
    if audio_duration > scene_frames / FPS - 0.1:
        raise RuntimeError(
            f"Narration for '{scene['id']}' is {audio_duration:.1f}s, "
            f"but the scene allows {scene_frames / FPS:.1f}s. "
            "Shorten the narration or adjust its scene duration."
        )

    captions: list[dict[str, Any]] = []
    group_start = 0
    for position, word_group in enumerate(aligned_words):
        grouped_text = " ".join(
            word
            for group in aligned_words[group_start : position + 1]
            for word in group["words"]
        )
        sentence_ended = word_group["words"][-1].endswith((".", "!", "?"))
        full = len(grouped_text) > 58 or len(grouped_text.split()) >= 9
        if sentence_ended or full or position == len(aligned_words) - 1:
            first = aligned_words[group_start]["first"]
            last = word_group["last"]
            start = scene["start"] + round(first["offset"] / 10_000_000 * FPS)
            end = scene["start"] + round(
                (last["offset"] + last["duration"]) / 10_000_000 * FPS
            )
            captions.append(
                {
                    "start": start,
                    "end": max(start + 1, end),
                    "text": grouped_text,
                    "scene": index,
                }
            )
            group_start = position + 1

    if captions[-1]["end"] > scene["start"] + scene_frames:
        raise RuntimeError(f"Subtitle timing exceeds scene '{scene['id']}'.")
    print(
        f"{scene['id']}: {audio_duration:.1f}s of {VOICE} narration at {RATE}; "
        f"{len(captions)} word-synced caption cues."
    )
    return captions


async def synthesize_narration() -> None:
    AUDIO.mkdir(parents=True, exist_ok=True)
    captions: list[dict[str, Any]] = []
    for index, scene in enumerate(CONTENT["scenes"]):
        captions.extend(await synthesize_scene(scene, index))

    captions.sort(key=lambda item: item["start"])
    (PUBLIC / "captions.json").write_text(json.dumps(captions, indent=2) + "\n")
    blocks = []
    for index, caption in enumerate(captions, start=1):
        blocks.append(
            f"{index}\n"
            f"{to_srt_time(caption['start'] / FPS)} --> "
            f"{to_srt_time(caption['end'] / FPS)}\n"
            f"{caption['text']}\n"
        )
    (ROOT / "SecantToTangent_Subtitles.srt").write_text("\n".join(blocks) + "\n")


def write_narration_script() -> None:
    runtime = sum(scene["duration"] for scene in CONTENT["scenes"]) / FPS
    lines = [
        "HOW DOES A SECANT LINE BECOME A TANGENT LINE?",
        f"{CONTENT['course']} | {CONTENT['student']} | {CONTENT['studentId']}",
        f"Voice: {VOICE} at {RATE}; English captions use Edge TTS word-boundary timing.",
        f"Planned runtime: {int(runtime // 60):02d}:{int(runtime % 60):02d} at 60 fps.",
        "",
    ]
    for index, scene in enumerate(CONTENT["scenes"]):
        start = scene["start"] / FPS
        end = (scene["start"] + scene["duration"]) / FPS
        lines.extend(
            [
                "",
                f"SCENE {index + 1}: {scene['title']} "
                f"({to_srt_time(start)} - {to_srt_time(end)})",
                *scene["narration"],
            ]
        )
    (ROOT / "narration_script.txt").write_text("\n".join(lines).strip() + "\n")


def generate_music() -> None:
    """Create an original, soft ambient chord bed with a fade at both ends."""
    duration = sum(scene["duration"] for scene in CONTENT["scenes"]) / FPS
    total_samples = int(duration * SAMPLE_RATE)
    progression = [
        (130.81, 164.81, 196.00),
        (110.00, 130.81, 164.81),
        (146.83, 174.61, 220.00),
        (98.00, 123.47, 146.83),
    ]
    chord_seconds = 16.0
    samples = bytearray()
    for sample_index in range(total_samples):
        time = sample_index / SAMPLE_RATE
        chord_index = int(time / chord_seconds) % len(progression)
        next_index = (chord_index + 1) % len(progression)
        blend = min(1.0, (time % chord_seconds) / 2.2)
        value = 0.0
        for weight, chord in (
            (1.0 - blend, progression[chord_index]),
            (blend, progression[next_index]),
        ):
            for note_index, frequency in enumerate(chord):
                phase = 2.0 * math.pi * frequency * time
                shimmer = 1.0 + 0.025 * math.sin(
                    2.0 * math.pi * (0.07 + note_index * 0.02) * time
                )
                value += (
                    weight
                    * math.sin(phase)
                    * shimmer
                    / (len(chord) * (1.0 + note_index * 0.2))
                )
        fade_in = min(1.0, time / 2.0)
        fade_out = min(1.0, (duration - time) / 4.0)
        value *= 0.045 * max(0.0, fade_in) * max(0.0, fade_out)
        samples.extend(
            struct.pack("<h", max(-32767, min(32767, round(value * 32767))))
        )

    with wave.open(str(AUDIO / "background_music.wav"), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(samples)


def main() -> None:
    asyncio.run(synthesize_narration())
    write_narration_script()
    generate_music()
    print(
        f"Generated word-synced captions, {VOICE} narration at {RATE}, "
        f"and {sum(s['duration'] for s in CONTENT['scenes']) / FPS:.0f}s of original music."
    )


if __name__ == "__main__":
    main()
