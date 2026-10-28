import React from 'react';
import {Composition} from 'remotion';
import {CookingLesson} from './cooking-lesson.jsx';

const defaults = {
  plan: {title: 'Cooking with Chef Maya', actions: [], ingredients: []},
  lesson: {duration: 10, steps: [], captions: [], envelope: []},
  audioFile: 'narration.wav',
  fps: 24,
  width: 1280,
  height: 720,
  durationInFrames: 240,
};

export const LifeMotionRoot = () => (
  <Composition
    id="LifeMotionCooking"
    component={CookingLesson}
    width={defaults.width}
    height={defaults.height}
    fps={defaults.fps}
    durationInFrames={defaults.durationInFrames}
    defaultProps={defaults}
    calculateMetadata={({props}) => ({
      width: props.width,
      height: props.height,
      fps: props.fps,
      durationInFrames: props.durationInFrames,
    })}
  />
);
