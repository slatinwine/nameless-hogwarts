// 无头测试 v2：在沙箱内做状态空间 DFS 全枚举（状态去重），验证结局可达性与死局
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const el = () => ({ style: {}, set innerHTML(v) {}, appendChild() {}, classList: { add() {} } });
const sb = {
  console,
  localStorage: { getItem: () => null, setItem() {} },
  document: { getElementById: () => el(), createElement: () => el(), querySelectorAll: () => [] },
  window: { scrollTo() {} },
  confirm: () => false,
  setTimeout: (f) => f(),
};
sb.globalThis = sb;
vm.createContext(sb);

const dfs = `
(function(){
  const visited = new Set();
  const endings = {};
  const deadEnds = [];
  let statesVisited = 0;
  function stateKey(s, scene){
    return scene + '|' + JSON.stringify([s.stats, s.items, s.flags]);
  }
  function dfs(s, scene, depth){
    if (depth > 50) return; // 防御：cave_wait 循环会让勇气无限增长
    statesVisited++;
    if (ENDINGS[scene]) { endings[scene] = (endings[scene]||0)+1; return; }
    const sceneDef = SCENES[scene];
    if (!sceneDef) { deadEnds.push('未知场景: '+scene); return; }
    const choices = (sceneDef.choices||[]).filter(function(c){
      try { return !c.if || c.if(s); } catch(e){ deadEnds.push('if异常@'+scene+': '+e.message); return false; }
    });
    if (choices.length === 0) { deadEnds.push('死局: '+scene); return; }
    for (const pick of choices){
      const s2 = JSON.parse(JSON.stringify(s));
      S = s2;  // flag()/stat()/corrupt() 操作全局 S，必须先指向克隆体
      if (pick.do) pick.do(s2);
      if (sceneDef.do) sceneDef.do(s2);
      let next = pick.go;
      const hub = (hubId, v, target) => { if (next === hubId && (s2.flags[v]||0) >= 2) next = target; };
      hub('hub1','h1v','ch2_intro'); hub('hub2','h2v','ch3_intro'); hub('hub3','h3v','ch4_intro');
      if (next === 'judge'){
        S = s2;
        next = judgeEnding();
      }
      const key = stateKey(s2, next);
      if (visited.has(key)) continue;
      visited.add(key);
      dfs(s2, next, depth + 1);
    }
  }
  dfs({stats:{勇气:1,智慧:1,魔力:1,人缘:0}, items:[], flags:{}, scene:'intro', hist:[]}, 'intro', 0);
  return {endings, deadEnds: [...new Set(deadEnds)], statesVisited, visitedSize: visited.size};
})()
`;

vm.runInContext(code + `\n__res = (${dfs});`, sb);
const res = sb.__res;

console.log('=== 状态空间 DFS 全枚举 ===');
console.log(`访问状态数: ${res.statesVisited}, 去重后转移: ${res.visitedSize}`);
console.log('可达结局:', JSON.stringify(res.endings));
if (res.deadEnds.length) console.log('问题:\n' + res.deadEnds.join('\n'));
else console.log('无死局 ✓');
const missing = Object.keys(sb.ENDINGS ? sb.ENDINGS : {}).length;
console.log('全部结局可达:', res.endings && Object.keys(res.endings).length >= 6 ? '✓ (6/6)' : '✗ 缺少: ' + (6 - Object.keys(res.endings||{}).length) + ' 个');
