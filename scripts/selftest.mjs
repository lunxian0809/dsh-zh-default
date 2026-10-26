// selftest：不启动 DSH 核心，用假 ctx 验证 apply() 只注册一段合法 section，
// 并打印真正会进入系统提示词的文本，便于人工确认。
import { strict as assert } from 'node:assert'
import { apply, buildText, SECTION_NAME } from '../lib/index.js'

function fakeContext() {
  const registered = []
  const effects = []
  return {
    registered,
    effects,
    logger: { info() {}, warn() {} },
    systemPrompt: {
      section(section) {
        registered.push(section)
        return () => {}
      },
    },
    effect(fn, label) {
      effects.push(label)
      const dispose = fn()
      return dispose
    },
  }
}

// 1) 默认配置：注册一段 section，名字固定，顺序在 persona(0) 与 plan 策略(500) 之间
const ctx = fakeContext()
apply(ctx, {})
assert.equal(ctx.registered.length, 1, '应当只注册一段 section')
assert.equal(ctx.registered[0].name, SECTION_NAME)
assert.ok(ctx.registered[0].order > 0 && ctx.registered[0].order < 500, 'section order 应位于 0..500')
assert.match(ctx.registered[0].text, /简体中文/)
assert.match(ctx.registered[0].text, /思考过程/)
assert.match(ctx.registered[0].text, /Always think and answer/)

// 2) enabled: false：什么都不注册
const off = fakeContext()
apply(off, { enabled: false })
assert.equal(off.registered.length, 0, '禁用时不应注册 section')

// 3) thinking: false：只约束回答，不再要求思考过程
const answerOnly = buildText({ thinking: false })
assert.ok(!answerOnly.includes('思考过程'), 'thinking:false 时不应出现思考过程要求')
assert.match(answerOnly, /最终回答/)
assert.match(answerOnly, /Always answer in/)

// 4) 自定义语言名 / 附加规则 / 顺序
const custom = fakeContext()
apply(custom, { language: '繁體中文', order: 420, extra: '- 回复末尾附一句总结。' })
assert.equal(custom.registered[0].order, 420)
assert.match(custom.registered[0].text, /繁體中文/)
assert.match(custom.registered[0].text, /回复末尾附一句总结/)

console.log('selftest ok — 将注入系统提示词的文本如下：\n')
console.log(ctx.registered[0].text)
