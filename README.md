




# How Does a Secant Line Become a Tangent Line?

An animated M3 calculus explainer by **Vanshika** (student ID **E25B071289**).
The 16:9 Remotion video uses a frame-driven SVG graph, moving secant, shrinking
`h`, animated algebra, an expressive English neural voice-over, original ambient
music, and burned-in English captions. The SRT is provided separately for
accessible playback and editing.

## Deliverables

- `SecantToTangent_Video.mp4` — final 1920 × 1080, 60 fps H.264 video (5:30)
- `SecantToTangent_Subtitles.srt` — timed English captions
- `storyboard.pdf` — six-part visual and narration storyboard
- `narration_script.txt` — complete timestamped narration
- `_Code/` — Remotion/React source, scripts, generated audio, and project setup

## Render or regenerate

Requirements: Python 3, Node.js/npm, and Google Chrome (used by Remotion and the
storyboard PDF exporter). Generating neural narration requires an internet
connection to the Edge TTS service.

```sh
cd _Code
python3 -m pip install -r requirements.txt
npm install
npm run audio
npm run storyboard
npm run typecheck
npm run render
```

`npm run audio` generates English narration with **en-US-AvaNeural** at **+14%**
speaking rate by default. Change the voice using `M3_TTS_VOICE` or the speed
using `M3_TTS_RATE`. The generator checks that each narration clip fits its
scene, uses Edge TTS word-boundary metadata for subtitle timing, and writes the
MP3 assets, captions, SRT, and timestamped narration script. It also creates an
original ambient chord bed; there are no third-party music recordings or
samples.

The renderer writes `SecantToTangent_Video.mp4` in the repository root. Rendering
at 60 fps takes time; the project is configured for H.264 with CRF 28 to keep
the final video practical to store and push. A 30-second visual summary leads
into a separate animated thank-you and author outro for a 5:30 target runtime.

## Mathematics

For `f(x) = x²`, fix `A = (1, 1)` and move
`B = (1 + h, (1 + h)²)`. For `h ≠ 0`,

```text
m = [f(1 + h) − f(1)] / h
  = [(1 + h)² − 1] / h
  = [1 + 2h + h² − 1] / h
  = (2h + h²) / h
  = 2 + h

lim(h→0) (2 + h) = 2   ⇒   f′(1) = 2
y − 1 = 2(x − 1)      ⇒   y = 2x − 1
```

The quotient is simplified for nonzero `h`; only then is the limit taken. The
limiting secant slope is the derivative and the slope of the tangent at `A`.

## Accessibility, credits, and AI disclosure

Narration uses the Edge TTS Ava Neural voice at +14%. Captions are burned into
the video and supplied as an SRT, timed from the narration's word-boundary
metadata. The quiet background music is an original ambient chord bed generated
by `_Code/scripts/build_audio.py`, with no third-party recordings or samples.

**AI-use disclosure:** AI tools assisted with code generation, neural
voice-over generation, and script formatting. The student reviewed the
mathematics and verified the final equations. The student name, full name, and
ID are editable in `_Code/src/content.json`.
