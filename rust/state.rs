use std::collections::HashMap;

use wasm_bindgen::JsValue;
use web_sys::{AnalyserNode, AudioContext, MediaRecorder, MediaStream, MediaStreamAudioSourceNode};

use crate::ml::MlState;
use crate::storage::{Recording, Session};
use crate::config::AppConfig;

#[derive(Default)]
pub struct TimerState {
  pub running: bool,
  pub start: f64,
  pub elapsed: f64,
  pub interval_id: Option<i32>,
}

#[derive(Default)]
pub struct FlowState {
  pub steps: HashMap<String, bool>,
}

#[derive(Default)]
pub struct TunerState {
  pub active: bool,
  pub audio_ctx: Option<AudioContext>,
  pub analyser: Option<AnalyserNode>,
  pub stream: Option<MediaStream>,
  pub raf_id: Option<i32>,
}

#[derive(Default)]
pub struct MetronomeState {
  pub active: bool,
  pub bpm: f64,
  pub interval_id: Option<i32>,
  pub beat: u32,
  pub accent: u32,
  pub audio_ctx: Option<AudioContext>,
}

#[derive(Default)]
pub struct RecorderState {
  pub active: bool,
  pub recorder: Option<MediaRecorder>,
  pub chunks: Vec<web_sys::Blob>,
  pub start_time: f64,
  pub stream: Option<MediaStream>,
  pub mime_type: String,
}

#[derive(Default)]
pub struct AudioWorkletState {
  pub active: bool,
  pub context: Option<AudioContext>,
  pub stream: Option<MediaStream>,
  pub source: Option<MediaStreamAudioSourceNode>,
  pub node: Option<JsValue>,
  pub sab: Option<JsValue>,
}

#[derive(Clone, Copy, PartialEq)]
pub enum MlCaptureMode {
  Analyzer,
  Worklet,
}

impl Default for MlCaptureMode {
  fn default() -> Self {
    Self::Analyzer
  }
}

#[derive(Default)]
pub struct MlCaptureState {
  pub active: bool,
  pub mode: MlCaptureMode,
  pub audio_ctx: Option<AudioContext>,
  pub analyser: Option<AnalyserNode>,
  pub stream: Option<MediaStream>,
  pub raf_id: Option<i32>,
}

#[derive(Default)]
pub struct AppState {
  pub sessions: Vec<Session>,
  pub recordings: Vec<Recording>,
  pub ml: MlState,
  pub config: AppConfig,
  pub session_timer: TimerState,
  pub flow: FlowState,
  pub tuner: TunerState,
  pub metronome: MetronomeState,
  pub recorder: RecorderState,
  pub audio_worklet: AudioWorkletState,
  pub ml_capture: MlCaptureState,
}
