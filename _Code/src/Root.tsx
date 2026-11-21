import {Audio, Composition, Sequence, staticFile} from 'remotion';
import {Video} from './Video';
import content from './content.json';

const durationInFrames = content.scenes.reduce(
  (total, scene) => total + scene.duration,
  0,
);

export const Root = () => (
  <>
    <Composition
      id="Root"
      component={Video}
      durationInFrames={durationInFrames}
      fps={content.fps}
      width={1920}
      height={1080}
    />
  </>
);

export const AudioTrack = () => (
  <>
    <Audio src={staticFile('audio/background_music.wav')} volume={0.12} />
    {content.scenes.map((scene, index) => (
      <Sequence
        key={scene.id}
        from={scene.start}
        durationInFrames={scene.duration}
        layout="none"
      >
        <Audio src={staticFile(`audio/narration_${index}.mp3`)} volume={1} />
      </Sequence>
    ))}
  </>
);
