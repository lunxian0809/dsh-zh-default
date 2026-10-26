// dsh-zh-default — 让 DeepSeek Harness 的思考过程（reasoning / thinking）与最终回答
// 默认使用简体中文。
//
// 设计：不注册工具、不改 UI、不翻译历史消息，只注册一段 system prompt section。
// 每次组装系统提示词时，这段文本排在 persona 之后、第一方指导之前，明确要求模型
// 用中文推理、用中文回答，同时保留代码 / 命令 / 路径 / 引用原文。
// 因为它是全局（unscoped）section，主会话、子代理、团队成员和工作流都会继承。
//
// 兼容：零依赖（不 import schemastery），只 inject 已存在的 systemPrompt 服务；
// 配置由 profile / bundle patch 的 row config 提供，缺省值在下面补齐。

export const name = 'zh-default'

/** 本插件只依赖系统提示词注册表。 */
export const inject = ['systemPrompt']

/** section 的唯一名字（全局注册，重复注册会抛错）。 */
export const SECTION_NAME = 'language:zh-default'

const DEFAULTS = {
  /** false 表示完全不注册 section（等价于禁用插件）。 */
  enabled: true,
  /** 提示词里展示的语言名，默认简体中文。 */
  language: '简体中文',
  /** 是否也要求“思考过程”用中文；false 时只要求最终回答。 */
  thinking: true,
  /** 是否附带一句英文兜底（英文指令对英文系统提示词的模型往往更硬）。 */
  bilingual: true,
  /** 段落在系统提示词中的排序位置：0 是 persona 前缀，500 是 plan 策略。 */
  order: 300,
  /** 追加的自定义规则（纯文本，多行用 \n 分隔）。 */
  extra: '',
}

function normalize(config) {
  const raw = config && typeof config === 'object' ? config : {}
  return {
    ...DEFAULTS,
    ...raw,
    enabled: raw.enabled !== false,
    thinking: raw.thinking !== false,
    bilingual: raw.bilingual !== false,
    language: typeof raw.language === 'string' && raw.language.trim() ? raw.language.trim() : DEFAULTS.language,
    order: Number.isFinite(raw.order) ? raw.order : DEFAULTS.order,
    extra: typeof raw.extra === 'string' ? raw.extra.trim() : '',
  }
}

/**
 * 生成注入系统提示词的段落文本。
 * @param {Partial<typeof DEFAULTS>} config 插件配置。
 * @returns {string} 段落文本（中文为主，可附一句英文兜底）。
 */
export function buildText(config = {}) {
  const cfg = normalize(config)
  const lang = cfg.language
  const lines = [`## 语言策略：默认使用${lang}`, '']

  if (cfg.thinking) {
    lines.push(
      `默认语言是${lang}。除非用户在本轮明确要求换用其他语言，或者任务本身必须输出非中文内容，你的**思考过程（reasoning / thinking）**与**最终回答**都使用${lang}：`,
      '',
      `- 思考过程：直接用${lang}推理、列计划、做自我检查，不要先用英文打草稿再翻译。`,
      `- 最终回答：正文用${lang}；代码、命令行、配置、路径、API/函数名、日志与引用原文保持原样，不翻译。`,
      `- 用户用英文或其他语言提问时，默认仍用${lang}回答；只有用户明确要求“用英文/某语言回答”时才切换。`,
      `- 中英混排时以${lang}为主，专业术语可在${lang}后括号附英文原词。`,
      '- 子代理（subagent）、团队成员与工作流里的输出同样遵循本策略。',
    )
  } else {
    lines.push(
      `默认语言是${lang}。除非用户在本轮明确要求换用其他语言，或者任务本身必须输出非中文内容，你的最终回答都使用${lang}：`,
      '',
      `- 最终回答：正文用${lang}；代码、命令行、配置、路径、API/函数名、日志与引用原文保持原样，不翻译。`,
      `- 用户用英文或其他语言提问时，默认仍用${lang}回答；只有用户明确要求“用英文/某语言回答”时才切换。`,
      `- 中英混排时以${lang}为主，专业术语可在${lang}后括号附英文原词。`,
      '- 子代理（subagent）、团队成员与工作流里的输出同样遵循本策略。',
    )
  }

  if (cfg.bilingual) {
    lines.push('', cfg.thinking
      ? `Always think and answer in ${lang} unless the user explicitly asks for another language in this turn. Keep code, commands, paths, and quoted source text verbatim.`
      : `Always answer in ${lang} unless the user explicitly asks for another language in this turn. Keep code, commands, paths, and quoted source text verbatim.`)
  }

  if (cfg.extra) lines.push('', cfg.extra)

  return lines.join('\n')
}

/**
 * 注册语言策略 section。
 * @param {import('@deepseek-ai/cordis').Context} ctx 插件上下文（已注入 systemPrompt）。
 * @param {Partial<typeof DEFAULTS>} [config] row config。
 */
export function apply(ctx, config = {}) {
  const cfg = normalize(config)
  if (!cfg.enabled) {
    ctx.logger?.info?.('[zh-default] disabled by config; no language section registered')
    return
  }

  ctx.effect(() => ctx.systemPrompt.section({
    name: SECTION_NAME,
    order: cfg.order,
    text: buildText(cfg),
  }), 'zh-default.section()')
}
