import type { ComponentType } from "react";
import { ScaleIn as Component_scale_in } from "@/remotion/primitives/scale-in";
import { Typewriter as Component_typewriter } from "@/remotion/primitives/typewriter";
import { Counter as Component_counter } from "@/remotion/primitives/counter";
import { BlurIn as Component_blur_in } from "@/remotion/primitives/blur-in";
import { SpringIn as Component_spring_in } from "@/remotion/primitives/spring-in";
import { StaggerChildren as Component_stagger_children } from "@/remotion/primitives/stagger-children";
import { MarkerHighlight as Component_marker_highlight } from "@/remotion/primitives/marker-highlight";
import { ProgressBar as Component_progress_bar } from "@/remotion/primitives/progress-bar";
import { RotateIn as Component_rotate_in } from "@/remotion/primitives/rotate-in";
import { TitleCard as Component_title_card } from "@/remotion/scenes/title-card";
import { FeatureList as Component_feature_list } from "@/remotion/scenes/feature-list";
import { StatCard as Component_stat_card } from "@/remotion/scenes/stat-card";
import { QuoteCard as Component_quote_card } from "@/remotion/scenes/quote-card";
import { EndCard as Component_end_card } from "@/remotion/scenes/end-card";
import { Intro as Component_intro } from "@/compositions/intro";
import { Showcase as Component_showcase } from "@/compositions/showcase";
import { HeroLoop as Component_hero_loop } from "@/compositions/hero-loop";
import { CaptionHighlight as Component_caption_highlight } from "@/remotion/primitives/caption-highlight";
import { AudiogramBars as Component_audiogram_bars } from "@/remotion/primitives/audiogram-bars";
import { PathDraw as Component_path_draw } from "@/remotion/primitives/path-draw";
import { MapCanvas as Component_map_canvas } from "@/remotion/primitives/map-canvas";
import { MapRoute as Component_map_route } from "@/remotion/primitives/map-route";
import { MapMarkers as Component_map_markers } from "@/remotion/primitives/map-markers";
import { MeshGradientBg as Component_mesh_gradient_bg } from "@/remotion/primitives/mesh-gradient-bg";
import { DynamicGrid as Component_dynamic_grid } from "@/remotion/primitives/dynamic-grid";
import { SimulatedCursor as Component_simulated_cursor } from "@/remotion/primitives/simulated-cursor";
import { ConfettiBurst as Component_confetti_burst } from "@/remotion/primitives/confetti-burst";
import { DeviceMockupZoom as Component_device_mockup_zoom } from "@/remotion/scenes/device-mockup-zoom";
import { CaptionScene as Component_caption_scene } from "@/remotion/scenes/caption-scene";
import { AudiogramScene as Component_audiogram_scene } from "@/remotion/scenes/audiogram-scene";
import { LogoReveal as Component_logo_reveal } from "@/remotion/scenes/logo-reveal";
import { MapFlight as Component_map_flight } from "@/remotion/scenes/map-flight";
import { AutoFitTitle as Component_auto_fit_title } from "@/remotion/scenes/auto-fit-title";
import { SocialClip as Component_social_clip } from "@/compositions/social-clip";
import { WaveformLine as Component_waveform_line } from "@/remotion/primitives/waveform-line";
import { AudioPulse as Component_audio_pulse } from "@/remotion/primitives/audio-pulse";
import { KaraokeCaptions as Component_karaoke_captions } from "@/remotion/primitives/karaoke-captions";
import { LineChartDraw as Component_line_chart_draw } from "@/remotion/primitives/line-chart-draw";
import { CursorPath as Component_cursor_path } from "@/remotion/primitives/cursor-path";
import { MediaFrame as Component_media_frame } from "@/remotion/scenes/media-frame";
import { MediaSequence as Component_media_sequence } from "@/remotion/scenes/media-sequence";
import { SplitScreen as Component_split_screen } from "@/remotion/scenes/split-screen";
import { AnimatedBarChart as Component_animated_bar_chart } from "@/remotion/scenes/animated-bar-chart";
import { MetricTicker as Component_metric_ticker } from "@/remotion/scenes/metric-ticker";
import { TimelineSteps as Component_timeline_steps } from "@/remotion/scenes/timeline-steps";
import { CalloutSpotlight as Component_callout_spotlight } from "@/remotion/scenes/callout-spotlight";
import { ZoomPanFrame as Component_zoom_pan_frame } from "@/remotion/scenes/zoom-pan-frame";
import { CodeReveal as Component_code_reveal } from "@/remotion/scenes/code-reveal";
import { HookCard as Component_hook_card } from "@/remotion/scenes/hook-card";
import { CommentCallout as Component_comment_callout } from "@/remotion/scenes/comment-callout";
import { TutorialClip as Component_tutorial_clip } from "@/compositions/tutorial-clip";
import { DataStory as Component_data_story } from "@/compositions/data-story";
import { CreatorReel as Component_creator_reel } from "@/compositions/creator-reel";
import { PodcastClip as Component_podcast_clip } from "@/compositions/podcast-clip";
import { TrackingIn as Component_tracking_in } from "@/remotion/primitives/tracking-in";
import { LightSweepText as Component_light_sweep_text } from "@/remotion/primitives/light-sweep-text";
import { SlotRoll as Component_slot_roll } from "@/remotion/primitives/slot-roll";
import { MatrixDecode as Component_matrix_decode } from "@/remotion/primitives/matrix-decode";
import { RgbGlitchText as Component_rgb_glitch_text } from "@/remotion/primitives/rgb-glitch-text";
import { InfiniteMarquee as Component_infinite_marquee } from "@/remotion/primitives/infinite-marquee";
import { StrikethroughReplace as Component_strikethrough_replace } from "@/remotion/primitives/strikethrough-replace";
import { TerminalSimulator as Component_terminal_simulator } from "@/remotion/scenes/terminal-simulator";
import { CodeAccordion as Component_code_accordion } from "@/remotion/scenes/code-accordion";
import { DataFlowPipes as Component_data_flow_pipes } from "@/remotion/scenes/data-flow-pipes";
import { DragDropFlow as Component_drag_drop_flow } from "@/remotion/scenes/drag-drop-flow";
import { ChatToPreview as Component_chat_to_preview } from "@/remotion/scenes/chat-to-preview";
import { HeroDeviceAssemble as Component_hero_device_assemble } from "@/compositions/hero-device-assemble";
import { EcosystemOrbit as Component_ecosystem_orbit } from "@/compositions/ecosystem-orbit";
import { BentoPan as Component_bento_pan } from "@/compositions/bento-pan";
import { BrowserFlow as Component_browser_flow } from "@/compositions/browser-flow";
import { AiGenerationCanvas as Component_ai_generation_canvas } from "@/compositions/ai-generation-canvas";
import { AiComposerShowcase as Component_ai_composer_showcase } from "@/compositions/ai-composer-showcase";
import { LiveCodeSplit as Component_live_code_split } from "@/compositions/live-code-split";
import { DeployReveal as Component_deploy_reveal } from "@/compositions/deploy-reveal";
import { DashboardPopulate as Component_dashboard_populate } from "@/compositions/dashboard-populate";
import { PricingFocus as Component_pricing_focus } from "@/compositions/pricing-focus";
import { LandingCodeShowcase as Component_landing_code_showcase } from "@/compositions/landing-code-showcase";
import { ImageExpand as Component_image_expand } from "@/compositions/image-expand";
import { ClaudeChat as Component_claude_chat } from "@/remotion/scenes/claude-chat";
import { ChatGpt as Component_chat_gpt } from "@/remotion/scenes/chat-gpt";
import { V0Composer as Component_v0 } from "@/remotion/scenes/v0";
import { ClaudeCode as Component_claude_code } from "@/remotion/scenes/claude-code";
import { Opencode as Component_opencode } from "@/remotion/scenes/opencode";
import { SplitTextChars as Component_split_text_chars } from "@/remotion/primitives/split-text-chars";
import { AudioReactiveScale as Component_audio_reactive_scale } from "@/remotion/primitives/audio-reactive-scale";
import { SrtCaptionTrack as Component_srt_caption_track } from "@/remotion/primitives/srt-caption-track";
import { SkewIn as Component_skew_in } from "@/remotion/primitives/skew-in";
import { ScrambleText as Component_scramble_text } from "@/remotion/primitives/scramble-text";
import { TextMaskVideo as Component_text_mask_video } from "@/remotion/primitives/text-mask-video";
import { HandwritingText as Component_handwriting_text } from "@/remotion/primitives/handwriting-text";
import { StrokeToFillText as Component_stroke_to_fill_text } from "@/remotion/primitives/stroke-to-fill-text";
import { VariableFontMorph as Component_variable_font_morph } from "@/remotion/primitives/variable-font-morph";
import { LiquidTextMorph as Component_liquid_text_morph } from "@/remotion/primitives/liquid-text-morph";
import { WaveText as Component_wave_text } from "@/remotion/primitives/wave-text";
import { NeonFlickerText as Component_neon_flicker_text } from "@/remotion/primitives/neon-flicker-text";
import { AuroraBg as Component_aurora_bg } from "@/remotion/primitives/aurora-bg";
import { ParticleField as Component_particle_field } from "@/remotion/primitives/particle-field";
import { TopographicLinesBg as Component_topographic_lines_bg } from "@/remotion/primitives/topographic-lines-bg";
import { CausticsBg as Component_caustics_bg } from "@/remotion/primitives/caustics-bg";
import { AnimatedNoiseGrain as Component_animated_noise_grain } from "@/remotion/primitives/animated-noise-grain";
import { LightRays as Component_light_rays } from "@/remotion/primitives/light-rays";
import { ParallaxLayers as Component_parallax_layers } from "@/remotion/primitives/parallax-layers";
import { ShakeEmphasis as Component_shake_emphasis } from "@/remotion/primitives/shake-emphasis";
import { GlowPulse as Component_glow_pulse } from "@/remotion/primitives/glow-pulse";
import { MotionTrail as Component_motion_trail } from "@/remotion/primitives/motion-trail";
import { SquashStretch as Component_squash_stretch } from "@/remotion/primitives/squash-stretch";
import { OrbitMotion as Component_orbit_motion } from "@/remotion/primitives/orbit-motion";
import { DepthOfFieldBlur as Component_depth_of_field_blur } from "@/remotion/primitives/depth-of-field-blur";
import { ScanlineCrt as Component_scanline_crt } from "@/remotion/primitives/scanline-crt";
import { BarChartRace as Component_bar_chart_race } from "@/remotion/primitives/bar-chart-race";
import { DonutChart as Component_donut_chart } from "@/remotion/primitives/donut-chart";
import { PieSliceReveal as Component_pie_slice_reveal } from "@/remotion/primitives/pie-slice-reveal";
import { ScatterPlotPop as Component_scatter_plot_pop } from "@/remotion/primitives/scatter-plot-pop";
import { BubbleChartPack as Component_bubble_chart_pack } from "@/remotion/primitives/bubble-chart-pack";
import { GaugeDial as Component_gauge_dial } from "@/remotion/primitives/gauge-dial";
import { SparklineRow as Component_sparkline_row } from "@/remotion/primitives/sparkline-row";
import { HeatmapGrid as Component_heatmap_grid } from "@/remotion/primitives/heatmap-grid";
import { ComparisonBars as Component_comparison_bars } from "@/remotion/primitives/comparison-bars";
import { FunnelChart as Component_funnel_chart } from "@/remotion/primitives/funnel-chart";
import { RadarChart as Component_radar_chart } from "@/remotion/primitives/radar-chart";
import { TreemapBlocks as Component_treemap_blocks } from "@/remotion/primitives/treemap-blocks";
import { WaterfallChart as Component_waterfall_chart } from "@/remotion/primitives/waterfall-chart";
import { StackedAreaChart as Component_stacked_area_chart } from "@/remotion/primitives/stacked-area-chart";
import { CandlestickChart as Component_candlestick_chart } from "@/remotion/primitives/candlestick-chart";
import { GanttTimeline as Component_gantt_timeline } from "@/remotion/primitives/gantt-timeline";
import { WordPopCaptions as Component_word_pop_captions } from "@/remotion/primitives/word-pop-captions";
import { CaptionEmojiBeat as Component_caption_emoji_beat } from "@/remotion/primitives/caption-emoji-beat";
import { SpeakerLabelCaptions as Component_speaker_label_captions } from "@/remotion/primitives/speaker-label-captions";
import { TranscriptScroll as Component_transcript_scroll } from "@/remotion/primitives/transcript-scroll";
import { SubtitleTranslate as Component_subtitle_translate } from "@/remotion/primitives/subtitle-translate";
import { WaveformBarsRadial as Component_waveform_bars_radial } from "@/remotion/primitives/waveform-bars-radial";
import { VuMeter as Component_vu_meter } from "@/remotion/primitives/vu-meter";
import { VoiceNoteBubble as Component_voice_note_bubble } from "@/remotion/primitives/voice-note-bubble";
import { BeatPulseGrid as Component_beat_pulse_grid } from "@/remotion/primitives/beat-pulse-grid";
import { AudioScrubber as Component_audio_scrubber } from "@/remotion/primitives/audio-scrubber";
import { PollOverlay as Component_poll_overlay } from "@/remotion/scenes/poll-overlay";
import { ReactionBurst as Component_reaction_burst } from "@/remotion/scenes/reaction-burst";
import { CountdownTimer as Component_countdown_timer } from "@/remotion/scenes/countdown-timer";
import { SportsScorebug as Component_sports_scorebug } from "@/remotion/scenes/sports-scorebug";
import { NewsTickerBar as Component_news_ticker_bar } from "@/remotion/scenes/news-ticker-bar";
import { FormFillSequence as Component_form_fill_sequence } from "@/remotion/scenes/form-fill-sequence";
import { NotificationStack as Component_notification_stack } from "@/remotion/scenes/notification-stack";
import { TabSwitchPanel as Component_tab_switch_panel } from "@/remotion/scenes/tab-switch-panel";
import { SearchResultsPopulate as Component_search_results_populate } from "@/remotion/scenes/search-results-populate";
import { FileTreeReveal as Component_file_tree_reveal } from "@/remotion/scenes/file-tree-reveal";
import { KanbanMove as Component_kanban_move } from "@/remotion/scenes/kanban-move";
import { CommitGraph as Component_commit_graph } from "@/remotion/scenes/commit-graph";
import { ComparisonTable as Component_comparison_table } from "@/remotion/scenes/comparison-table";
import { PricingCard as Component_pricing_card } from "@/remotion/scenes/pricing-card";
import { FaqAccordion as Component_faq_accordion } from "@/remotion/scenes/faq-accordion";
import { TeamGrid as Component_team_grid } from "@/remotion/scenes/team-grid";
import { LogoWall as Component_logo_wall } from "@/remotion/scenes/logo-wall";
import { ChangelogEntry as Component_changelog_entry } from "@/remotion/scenes/changelog-entry";
import { RoadmapLanes as Component_roadmap_lanes } from "@/remotion/scenes/roadmap-lanes";
import { OrgChartBuild as Component_org_chart_build } from "@/remotion/scenes/org-chart-build";
import { QuizQuestion as Component_quiz_question } from "@/remotion/scenes/quiz-question";
import { WeatherCard as Component_weather_card } from "@/remotion/scenes/weather-card";
import { CalendarMonthFill as Component_calendar_month_fill } from "@/remotion/scenes/calendar-month-fill";
import { ArrowAnnotate as Component_arrow_annotate } from "@/remotion/primitives/arrow-annotate";
import { BadgeStamp as Component_badge_stamp } from "@/remotion/primitives/badge-stamp";
import { ShapeMorph as Component_shape_morph } from "@/remotion/primitives/shape-morph";
import { BlobMorph as Component_blob_morph } from "@/remotion/primitives/blob-morph";
import { DashedPathTravel as Component_dashed_path_travel } from "@/remotion/primitives/dashed-path-travel";
import { ConnectorLines as Component_connector_lines } from "@/remotion/primitives/connector-lines";
import { SvgMaskReveal as Component_svg_mask_reveal } from "@/remotion/primitives/svg-mask-reveal";
import { MapHeatOverlay as Component_map_heat_overlay } from "@/remotion/primitives/map-heat-overlay";
import { GlobeArc as Component_globe_arc } from "@/remotion/primitives/globe-arc";
import { MultiDeviceLineup as Component_multi_device_lineup } from "@/remotion/primitives/multi-device-lineup";
import { DeviceMockup3D as Component_device_mockup_3d } from "@/remotion/scenes/device-mockup-3d";
import { LightTunnelBg as Component_light_tunnel_bg } from "@/remotion/primitives/light-tunnel-bg";
import { TextRevealShader as Component_text_reveal_shader } from "@/remotion/primitives/text-reveal-shader";
import { DitherFieldBg as Component_dither_field_bg } from "@/remotion/primitives/dither-field-bg";
import { WarpBandsBg as Component_warp_bands_bg } from "@/remotion/primitives/warp-bands-bg";
import { GrainGradientBg as Component_grain_gradient_bg } from "@/remotion/primitives/grain-gradient-bg";
import { ProductTurntable3d as Component_product_turntable_3d } from "@/remotion/scenes/product-turntable-3d";
import { TextExtrude3d as Component_text_extrude_3d } from "@/remotion/scenes/text-extrude-3d";
import { CardStack3d as Component_card_stack_3d } from "@/remotion/scenes/card-stack-3d";
import { GlobePoints3d as Component_globe_points_3d } from "@/remotion/scenes/globe-points-3d";
import { ShapeLayer as Component_shape_layer } from "@/remotion/primitives/shape-layer";
import { TextAnimator as Component_text_animator } from "@/remotion/primitives/text-animator";
import { EffectorField as Component_effector_field } from "@/remotion/primitives/effector-field";
import { SlitScan as Component_slit_scan } from "@/remotion/primitives/slit-scan";
import { IkRig as Component_ik_rig } from "@/remotion/primitives/ik-rig";
import { TrackMatte as Component_track_matte } from "@/remotion/primitives/track-matte";
import { FollowThrough as Component_follow_through } from "@/remotion/primitives/follow-through";

export const library = {
  "scale-in": Component_scale_in,
  "typewriter": Component_typewriter,
  "counter": Component_counter,
  "blur-in": Component_blur_in,
  "spring-in": Component_spring_in,
  "stagger-children": Component_stagger_children,
  "marker-highlight": Component_marker_highlight,
  "progress-bar": Component_progress_bar,
  "rotate-in": Component_rotate_in,
  "title-card": Component_title_card,
  "feature-list": Component_feature_list,
  "stat-card": Component_stat_card,
  "quote-card": Component_quote_card,
  "end-card": Component_end_card,
  "intro": Component_intro,
  "showcase": Component_showcase,
  "hero-loop": Component_hero_loop,
  "caption-highlight": Component_caption_highlight,
  "audiogram-bars": Component_audiogram_bars,
  "path-draw": Component_path_draw,
  "map-canvas": Component_map_canvas,
  "map-route": Component_map_route,
  "map-markers": Component_map_markers,
  "mesh-gradient-bg": Component_mesh_gradient_bg,
  "dynamic-grid": Component_dynamic_grid,
  "simulated-cursor": Component_simulated_cursor,
  "confetti-burst": Component_confetti_burst,
  "device-mockup-zoom": Component_device_mockup_zoom,
  "caption-scene": Component_caption_scene,
  "audiogram-scene": Component_audiogram_scene,
  "logo-reveal": Component_logo_reveal,
  "map-flight": Component_map_flight,
  "auto-fit-title": Component_auto_fit_title,
  "social-clip": Component_social_clip,
  "waveform-line": Component_waveform_line,
  "audio-pulse": Component_audio_pulse,
  "karaoke-captions": Component_karaoke_captions,
  "line-chart-draw": Component_line_chart_draw,
  "cursor-path": Component_cursor_path,
  "media-frame": Component_media_frame,
  "media-sequence": Component_media_sequence,
  "split-screen": Component_split_screen,
  "animated-bar-chart": Component_animated_bar_chart,
  "metric-ticker": Component_metric_ticker,
  "timeline-steps": Component_timeline_steps,
  "callout-spotlight": Component_callout_spotlight,
  "zoom-pan-frame": Component_zoom_pan_frame,
  "code-reveal": Component_code_reveal,
  "hook-card": Component_hook_card,
  "comment-callout": Component_comment_callout,
  "tutorial-clip": Component_tutorial_clip,
  "data-story": Component_data_story,
  "creator-reel": Component_creator_reel,
  "podcast-clip": Component_podcast_clip,
  "tracking-in": Component_tracking_in,
  "light-sweep-text": Component_light_sweep_text,
  "slot-roll": Component_slot_roll,
  "matrix-decode": Component_matrix_decode,
  "rgb-glitch-text": Component_rgb_glitch_text,
  "infinite-marquee": Component_infinite_marquee,
  "strikethrough-replace": Component_strikethrough_replace,
  "terminal-simulator": Component_terminal_simulator,
  "code-accordion": Component_code_accordion,
  "data-flow-pipes": Component_data_flow_pipes,
  "drag-drop-flow": Component_drag_drop_flow,
  "chat-to-preview": Component_chat_to_preview,
  "hero-device-assemble": Component_hero_device_assemble,
  "ecosystem-orbit": Component_ecosystem_orbit,
  "bento-pan": Component_bento_pan,
  "browser-flow": Component_browser_flow,
  "ai-generation-canvas": Component_ai_generation_canvas,
  "ai-composer-showcase": Component_ai_composer_showcase,
  "live-code-split": Component_live_code_split,
  "deploy-reveal": Component_deploy_reveal,
  "dashboard-populate": Component_dashboard_populate,
  "pricing-focus": Component_pricing_focus,
  "landing-code-showcase": Component_landing_code_showcase,
  "image-expand": Component_image_expand,
  "claude-chat": Component_claude_chat,
  "chat-gpt": Component_chat_gpt,
  "v0": Component_v0,
  "claude-code": Component_claude_code,
  "opencode": Component_opencode,
  "split-text-chars": Component_split_text_chars,
  "audio-reactive-scale": Component_audio_reactive_scale,
  "srt-caption-track": Component_srt_caption_track,
  "skew-in": Component_skew_in,
  "scramble-text": Component_scramble_text,
  "text-mask-video": Component_text_mask_video,
  "handwriting-text": Component_handwriting_text,
  "stroke-to-fill-text": Component_stroke_to_fill_text,
  "variable-font-morph": Component_variable_font_morph,
  "liquid-text-morph": Component_liquid_text_morph,
  "wave-text": Component_wave_text,
  "neon-flicker-text": Component_neon_flicker_text,
  "aurora-bg": Component_aurora_bg,
  "particle-field": Component_particle_field,
  "topographic-lines-bg": Component_topographic_lines_bg,
  "caustics-bg": Component_caustics_bg,
  "animated-noise-grain": Component_animated_noise_grain,
  "light-rays": Component_light_rays,
  "parallax-layers": Component_parallax_layers,
  "shake-emphasis": Component_shake_emphasis,
  "glow-pulse": Component_glow_pulse,
  "motion-trail": Component_motion_trail,
  "squash-stretch": Component_squash_stretch,
  "orbit-motion": Component_orbit_motion,
  "depth-of-field-blur": Component_depth_of_field_blur,
  "scanline-crt": Component_scanline_crt,
  "bar-chart-race": Component_bar_chart_race,
  "donut-chart": Component_donut_chart,
  "pie-slice-reveal": Component_pie_slice_reveal,
  "scatter-plot-pop": Component_scatter_plot_pop,
  "bubble-chart-pack": Component_bubble_chart_pack,
  "gauge-dial": Component_gauge_dial,
  "sparkline-row": Component_sparkline_row,
  "heatmap-grid": Component_heatmap_grid,
  "comparison-bars": Component_comparison_bars,
  "funnel-chart": Component_funnel_chart,
  "radar-chart": Component_radar_chart,
  "treemap-blocks": Component_treemap_blocks,
  "waterfall-chart": Component_waterfall_chart,
  "stacked-area-chart": Component_stacked_area_chart,
  "candlestick-chart": Component_candlestick_chart,
  "gantt-timeline": Component_gantt_timeline,
  "word-pop-captions": Component_word_pop_captions,
  "caption-emoji-beat": Component_caption_emoji_beat,
  "speaker-label-captions": Component_speaker_label_captions,
  "transcript-scroll": Component_transcript_scroll,
  "subtitle-translate": Component_subtitle_translate,
  "waveform-bars-radial": Component_waveform_bars_radial,
  "vu-meter": Component_vu_meter,
  "voice-note-bubble": Component_voice_note_bubble,
  "beat-pulse-grid": Component_beat_pulse_grid,
  "audio-scrubber": Component_audio_scrubber,
  "poll-overlay": Component_poll_overlay,
  "reaction-burst": Component_reaction_burst,
  "countdown-timer": Component_countdown_timer,
  "sports-scorebug": Component_sports_scorebug,
  "news-ticker-bar": Component_news_ticker_bar,
  "form-fill-sequence": Component_form_fill_sequence,
  "notification-stack": Component_notification_stack,
  "tab-switch-panel": Component_tab_switch_panel,
  "search-results-populate": Component_search_results_populate,
  "file-tree-reveal": Component_file_tree_reveal,
  "kanban-move": Component_kanban_move,
  "commit-graph": Component_commit_graph,
  "comparison-table": Component_comparison_table,
  "pricing-card": Component_pricing_card,
  "faq-accordion": Component_faq_accordion,
  "team-grid": Component_team_grid,
  "logo-wall": Component_logo_wall,
  "changelog-entry": Component_changelog_entry,
  "roadmap-lanes": Component_roadmap_lanes,
  "org-chart-build": Component_org_chart_build,
  "quiz-question": Component_quiz_question,
  "weather-card": Component_weather_card,
  "calendar-month-fill": Component_calendar_month_fill,
  "arrow-annotate": Component_arrow_annotate,
  "badge-stamp": Component_badge_stamp,
  "shape-morph": Component_shape_morph,
  "blob-morph": Component_blob_morph,
  "dashed-path-travel": Component_dashed_path_travel,
  "connector-lines": Component_connector_lines,
  "svg-mask-reveal": Component_svg_mask_reveal,
  "map-heat-overlay": Component_map_heat_overlay,
  "globe-arc": Component_globe_arc,
  "multi-device-lineup": Component_multi_device_lineup,
  "device-mockup-3d": Component_device_mockup_3d,
  "light-tunnel-bg": Component_light_tunnel_bg,
  "text-reveal-shader": Component_text_reveal_shader,
  "dither-field-bg": Component_dither_field_bg,
  "warp-bands-bg": Component_warp_bands_bg,
  "grain-gradient-bg": Component_grain_gradient_bg,
  "product-turntable-3d": Component_product_turntable_3d,
  "text-extrude-3d": Component_text_extrude_3d,
  "card-stack-3d": Component_card_stack_3d,
  "globe-points-3d": Component_globe_points_3d,
  "shape-layer": Component_shape_layer,
  "text-animator": Component_text_animator,
  "effector-field": Component_effector_field,
  "slit-scan": Component_slit_scan,
  "ik-rig": Component_ik_rig,
  "track-matte": Component_track_matte,
  "follow-through": Component_follow_through,
} as unknown as Record<string, ComponentType<Record<string, unknown>>>;
