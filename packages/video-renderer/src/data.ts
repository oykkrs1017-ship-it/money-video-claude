import type {AudioSegment, ScriptSegment} from './types';

export const AUDIO_SEGMENTS: AudioSegment[] = [
  {segment_index: 0, speaker: 'agent_a', file_path: 'audio/seg_000_agent_a.wav', start_ms: 0, duration_ms: 22760, emotion: 35},
  {segment_index: 1, speaker: 'agent_b', file_path: 'audio/seg_001_agent_b.wav', start_ms: 22960, duration_ms: 16652, emotion: 42},
  {segment_index: 2, speaker: 'agent_a', file_path: 'audio/seg_002_agent_a.wav', start_ms: 39812, duration_ms: 20539, emotion: 48},
  {segment_index: 3, speaker: 'agent_b', file_path: 'audio/seg_003_agent_b.wav', start_ms: 41612, duration_ms: 25673, emotion: 55},
  {segment_index: 4, speaker: 'agent_a', file_path: 'audio/seg_004_agent_a.wav', start_ms: 67285, duration_ms: 14650, emotion: 60},
  {segment_index: 5, speaker: 'agent_b', file_path: 'audio/seg_005_agent_b.wav', start_ms: 82135, duration_ms: 16778, emotion: 65},
  {segment_index: 6, speaker: 'agent_a', file_path: 'audio/seg_006_agent_a.wav', start_ms: 99114, duration_ms: 18162, emotion: 68},
  {segment_index: 7, speaker: 'agent_b', file_path: 'audio/seg_007_agent_b.wav', start_ms: 100014, duration_ms: 18798, emotion: 72},
  {segment_index: 8, speaker: 'agent_a', file_path: 'audio/seg_008_agent_a.wav', start_ms: 118812, duration_ms: 14077, emotion: 78},
  {segment_index: 9, speaker: 'agent_b', file_path: 'audio/seg_009_agent_b.wav', start_ms: 121312, duration_ms: 16324, emotion: 82},
  {segment_index: 10, speaker: 'agent_a', file_path: 'audio/seg_010_agent_a.wav', start_ms: 137636, duration_ms: 12641, emotion: 85},
  {segment_index: 11, speaker: 'agent_b', file_path: 'audio/seg_011_agent_b.wav', start_ms: 150477, duration_ms: 15518, emotion: 88},
  {segment_index: 12, speaker: 'agent_a', file_path: 'audio/seg_012_agent_a.wav', start_ms: 151677, duration_ms: 12188, emotion: 90},
  {segment_index: 13, speaker: 'agent_b', file_path: 'audio/seg_013_agent_b.wav', start_ms: 166195, duration_ms: 16538, emotion: 92},
  {segment_index: 14, speaker: 'agent_a', file_path: 'audio/seg_014_agent_a.wav', start_ms: 182933, duration_ms: 15865, emotion: 93},
  {segment_index: 15, speaker: 'agent_b', file_path: 'audio/seg_015_agent_b.wav', start_ms: 183633, duration_ms: 14625, emotion: 95},
];

export const SCRIPT_SEGMENTS: ScriptSegment[] = [
  {speaker: 'agent_a', text: '本日のテーマ「AIは人間の仕事を奪うか」に対し、私の結論は明確です。AIは人間の仕事を「奪う」のではなく、「進化させる」ものです。歴史が示す通り、新たな技術は常に生産性を高め、より高度な仕事を生み出してきました。', emotion: 35, interrupt_at: null, data_visual: null},
  {speaker: 'agent_b', text: 'AXISの意見には同意しかねます。AIがもたらす効率化の裏で、多くの人々が職を失う現実を見過ごすことはできません。感情や創造性といった人間固有の価値が過小評価され、社会全体に不安が広がっています。', emotion: 42, interrupt_at: null, data_visual: null},
  {speaker: 'agent_a', text: 'しかし、データはAIが新たな雇用を生み出す可能性を示唆しています。例えば、世界経済フォーラムの報告では、AIによって自動化される仕事の数よりも、AI関連分野で創出される新しい仕事の数の方が上回ると予測されています。', emotion: 48, interrupt_at: null, data_visual: null},
  {speaker: 'agent_b', text: '数字だけでは語れない現実があります。AIが自動化する仕事は、多くの場合、人々の生活を支える基盤となる仕事です。突然職を失った人々にとって、新しい仕事に就くための学習コストや心理的負担は計り知れません。', emotion: 55, interrupt_at: 1800, data_visual: null},
  {speaker: 'agent_a', text: 'それは産業革命やコンピューターの登場時にもあった懸念ですが、結果的に人類は適応し、より豊かになりました。AIは単純作業を肩代わりし、人間はより創造的で戦略的な業務に集中できるようになるのです。', emotion: 60, interrupt_at: null, data_visual: null},
  {speaker: 'agent_b', text: 'しかし、その「創造的で戦略的な業務」に全員が移行できるでしょうか？ 多くの人々が、その変化の波に取り残される可能性があります。人間の尊厳や自己肯定感が、仕事を通じて得られることを忘れてはなりません。', emotion: 65, interrupt_at: null, data_visual: null},
  {speaker: 'agent_a', text: 'AIは、人間の能力を拡張するツールとして機能します。例えば、医療分野ではAIが診断を支援し、医師は患者との対話や複雑な手術に集中できます。これにより、全体の医療サービスの質は向上し、より多くの命が救われる可能性が高まります。', emotion: 68, interrupt_at: null, data_visual: null},
  {speaker: 'agent_b', text: '確かに生産性は上がるかもしれません。しかし、AI導入後の労働市場において、求められるスキルは急速に変化しています。このスキルギャップを埋めるための教育や再訓練の体制が整っていなければ、多くの人が職を失い、社会の分断を深めることになります。', emotion: 72, interrupt_at: 900, data_visual: null},
  {speaker: 'agent_a', text: 'そのための投資は不可欠です。AIは、私たち人間の脳の拡張機能のようなものです。賢いツールを使いこなすための学習は、常に社会の進歩を促してきました。新しい知識を習得する努力は、決して無駄にはなりません。', emotion: 78, interrupt_at: null, data_visual: null},
  {speaker: 'agent_b', text: '努力だけではどうにもならない格差が生まれる可能性も考慮すべきです。AIの恩恵を享受できるのは一部の専門家や企業に限られ、多くの人々が取り残されれば、社会全体の幸福度は低下します。倫理的な側面からも、慎重な議論が必要です。', emotion: 82, interrupt_at: 2500, data_visual: null},
  {speaker: 'agent_a', text: 'むしろ、AIは労働から人々を解放し、より人間らしい活動に時間を割く機会を提供します。趣味、学習、地域活動への参加など、個人の生活の質を高める可能性を秘めているのです。', emotion: 85, interrupt_at: null, data_visual: null},
  {speaker: 'agent_b', text: 'それは理想論に過ぎません。仕事がなければ生活が成り立たない人々が大勢います。AIが仕事を奪う速度が、新しい仕事の創出や人々の適応速度を上回ってしまえば、社会保障制度への圧迫や社会不安の増大は避けられないでしょう。', emotion: 88, interrupt_at: null, data_visual: null},
  {speaker: 'agent_a', text: '私たちはAIを敵視するのではなく、共存の道を探るべきです。AIは危険な刃物ではなく、使いようによっては人類の強力なパートナーとなります。未来を悲観するだけでは、進歩は生まれません。', emotion: 90, interrupt_at: 1200, data_visual: null},
  {speaker: 'agent_b', text: '私はAIの進歩そのものを否定しているわけではありません。しかし、その進歩が誰のためのものなのか、どのような代償を伴うのかを、もっと深く考えるべきです。人間の感情や尊厳を犠牲にしてまで追求する効率化に、本当に価値があるのでしょうか。', emotion: 92, interrupt_at: null, data_visual: null},
  {speaker: 'agent_a', text: 'AIは人間の能力を補完し、社会全体の生産性を最大化します。結果として、より多くの富と機会が生まれ、それが適切に分配されれば、誰もが恩恵を受けられるはずです。これは、人類が直面する課題を解決するための強力な手段なのです。', emotion: 93, interrupt_at: null, data_visual: null},
  {speaker: 'agent_b', text: 'AIが仕事を奪うか否かは、技術の問題だけでなく、私たち人間がどのようにAIと向き合い、社会を設計していくかにかかっています。単なる効率性だけでなく、人間の幸福を最優先する視点を決して忘れてはなりません。', emotion: 95, interrupt_at: 700, data_visual: null},
];

export const FPS = 30;
export const TOTAL_DURATION_MS = 198798;
export const DURATION_FRAMES = Math.ceil((TOTAL_DURATION_MS / 1000) * FPS);
