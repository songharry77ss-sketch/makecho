export type Action = 'feed'|'clean'|'play'|'rest'|'explore';
export type State = {version:1;name:string;food:number;energy:number;joy:number;clean:number;xp:number;coins:number;research:number;lastAt:number;bornAt:number;actions:Record<Action,number>;owned:string[];habitat:string;finds:string[];log:string[];claimed:string[]};
export const initial = (now=Date.now()):State=>({version:1,name:'모모',food:74,energy:82,joy:88,clean:68,xp:0,coins:120,research:0,lastAt:now,bornAt:now,actions:{feed:0,clean:0,play:0,rest:0,explore:0},owned:['meadow'],habitat:'meadow',finds:[],log:['모모와의 첫 번째 날. 작은 정원에 오신 걸 환영해요.'],claimed:[]});
const clamp=(n:number)=>Math.min(100,Math.max(0,n));
export const level=(s:State)=>Math.floor(s.xp/100)+1;
export function advance(s:State,now=Date.now()):State {const mins=Math.min(480,Math.max(0,now-s.lastAt)/60000);return {...s,food:clamp(s.food-mins*.15),energy:clamp(s.energy-mins*.08),joy:clamp(s.joy-mins*.06),clean:clamp(s.clean-mins*.1),lastAt:Math.max(now,s.lastAt)};}
export const specimens=[{id:'clover',name:'네잎클로버',desc:'풀숲에 숨겨진 작은 행운',emoji:'🍀'},{id:'dew',name:'아침 이슬',desc:'잎 끝에 맺힌 반짝이는 물방울',emoji:'💧'},{id:'pollen',name:'황금 꽃가루',desc:'바람을 따라 도착한 선물',emoji:'🌼'},{id:'berry',name:'야생 딸기',desc:'모모가 가장 좋아하는 향기',emoji:'🍓'},{id:'mushroom',name:'꼬마 버섯',desc:'촉촉한 흙에서 만난 이웃',emoji:'🍄'},{id:'crystal',name:'달빛 조약돌',desc:'밤의 정원에서 주운 보물',emoji:'💎'}];
export const habitats=[{id:'meadow',name:'햇살 초원',cost:0,level:1,desc:'햇빛과 풀 내음이 가득한 첫 집',emoji:'🌱'},{id:'forest',name:'이슬 숲',cost:160,level:2,desc:'반딧불이 반짝이는 신비로운 숲',emoji:'🌿'},{id:'sunset',name:'노을 정원',cost:240,level:3,desc:'따뜻한 햇살이 머무는 과일 정원',emoji:'🍊'}];
export function act(input:State,action:Action,now=Date.now()):{state:State;message:string;ok:boolean} {
 let s=advance(input,now);const fail=(message:string)=>({state:s,message,ok:false});
 if(action==='feed'&&s.food>95)return fail('아직 배가 불러요. 조금 뒤에 간식을 주세요.');
 if(action==='clean'&&s.clean>95)return fail('이미 반짝반짝 깨끗해요!');
 if(action==='rest'&&s.energy>95)return fail('충분히 쉬었어요. 함께 놀아 볼까요?');
 if((action==='play'||action==='explore')&&s.energy<20)return fail('먼저 쉬어야 해요. 에너지가 20 이상 필요해요.');
 if(action==='feed'&&s.coins<5)return fail('꽃잎이 부족해요. 관찰이나 청소로 모아 보세요.');
 let message=''; let xp=8;
 if(action==='feed'){s.food=clamp(s.food+24);s.joy=clamp(s.joy+5);s.coins-=5;message='달콤한 딸기 한 입! 모모가 행복해해요.';}
 if(action==='clean'){s.clean=clamp(s.clean+30);s.coins+=8;message='보송보송한 새 기분. 꽃잎 8개를 얻었어요.';}
 if(action==='play'){s.joy=clamp(s.joy+20);s.energy=clamp(s.energy-14);s.food=clamp(s.food-6);s.coins+=10;message='잎사귀 사이를 훨훨! 꽃잎 10개를 얻었어요.';}
 if(action==='rest'){s.energy=clamp(s.energy+30);s.food=clamp(s.food-3);message='잎사귀 그늘에서 잠깐 쉬었어요.';}
 if(action==='explore'){s.energy=clamp(s.energy-20);s.food=clamp(s.food-10);s.clean=clamp(s.clean-8);s.coins+=18;s.research+=5;xp=20;const available=level(s)*2;const item=specimens[s.actions.explore%Math.min(6,available)];s.finds=Array.from(new Set([...s.finds,item.id]));message=`${item.name} 발견! 꽃잎 18개와 연구 노트 5개를 얻었어요.`;}
 const oldLevel=level(s);s={...s,xp:s.xp+xp,actions:{...s.actions,[action]:s.actions[action]+1}};if(level(s)>oldLevel){s.coins+=30;message+=` 레벨 ${level(s)} 달성! 꽃잎 +30`;}s.log=[message,...s.log].slice(0,30);return {state:s,message,ok:true};
}
export function buyHabitat(s:State,id:string):{state:State;message:string} {const h=habitats.find(h=>h.id===id);if(!h)return {state:s,message:'알 수 없는 정원이에요.'};if(s.owned.includes(id))return {state:{...s,habitat:id},message:`${h.name}으로 이사했어요.`};if(level(s)<h.level||s.coins<h.cost)return {state:s,message:`레벨 ${h.level}과 꽃잎 ${h.cost}개가 필요해요.`};return {state:{...s,coins:s.coins-h.cost,owned:[...s.owned,id],habitat:id},message:`${h.name}이 열렸어요!`};}
export const quests=[{id:'feed',title:'달콤한 첫 인사',desc:'모모에게 먹이 3번 주기',target:3,reward:25},{id:'clean',title:'반짝이는 우리 집',desc:'정원 2번 청소하기',target:2,reward:20},{id:'explore',title:'작은 모험가',desc:'정원 밖으로 2번 탐험하기',target:2,reward:35}] as const;
export function claim(s:State,id:string):State {const q=quests.find(q=>q.id===id);if(!q||s.claimed.includes(id)||s.actions[q.id]<q.target)return s;return {...s,coins:s.coins+q.reward,claimed:[...s.claimed,id]};}
export function parseSave(value:string):State {const s=JSON.parse(value);if(s.version!==1||typeof s.name!=='string'||s.name.length>20||!['food','energy','joy','clean','xp','coins','research','lastAt','bornAt'].every(k=>typeof s[k]==='number'&&Number.isFinite(s[k])&&s[k]>=0)||!['food','energy','joy','clean'].every(k=>s[k]<=100)||!['feed','clean','play','rest','explore'].every(k=>Number.isInteger(s.actions?.[k])&&s.actions[k]>=0)||!['owned','finds','log','claimed'].every(k=>Array.isArray(s[k])&&s[k].every((v:unknown)=>typeof v==='string'))||!habitats.some(h=>h.id===s.habitat)||!s.owned.includes(s.habitat))throw Error('올바른 makecho 저장 파일이 아니에요.');return advance(s);}
export const SAVE_KEY='makecho.save.v1';
