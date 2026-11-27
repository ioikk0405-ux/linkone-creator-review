'use strict';
const CreatorReview=(()=>{
  const topics={
    beauty:['뷰티','뷰티|스킨케어|화장품|발색|메이크업|립틴트|올리브영|선크림|beauty|skincare|skin care|makeup|grwm|kbeauty|k-beauty|lipstick|sephora|foundation|swatch|serum|sunscreen|cosmetic|cosmetics|eyeshadow|eye shadow|eyeliner|mascara|concealer|lip gloss|lip tint|blush|setting spray|hair dye|hair color|color my hair|colour my hair|아이섀도|섀도우|마스카라|립글로스|염색|보습제|클렌저|토너|로션|앰플|세럼|마스크팩|아이크림|샴푸|립밤|cleanser|toner|ampoule|moisturizer|moisturiser|sheet mask|eye cream|face cream|shampoo|hair mask|lip balm'],
    home:['리빙','리빙|생활용품|인테리어|소품|수납|가구|화병|주방|살림|집꾸미기|넥쿨러|선풍기|손난로|핫팩|home decor|homeware|organizer|storage|furniture|kitchen|ceramic|ceramics|vase|shelf|tableware|bedding|neck cooler|neck fan|portable fan|hand warmer|hand warmers|침구|조명|수건|청소용품|주방용품|조리도구|수납함|세제|디퓨저|lamp|cookware|utensils|towels|detergent|diffuser|appliance'],
    health:['건강식품','건강식품|건강기능식품|홍삼|인삼스틱|영양제|멀티비타민|비타민 젤리|비타민 구미|비타민 정|red ginseng|ginseng extract|ginseng stick|ginseng sticks|multivitamin|multivitamins|dietary supplement|dietary supplements|vitamin gummies|vitamin tablets|herbal supplement|herbal supplements']};


  const livingAliases=[
    '살림템|가정용품|household essentials|housewares|home goods|home essentials','주방템|kitchen finds|kitchen gadgets|kitchen essentials','집 정리|home organization|home organisation',
    // 음용·조리·식탁
    '텀블러|tumbler|tumblers|travel mug|travel mugs','머그컵|머그잔|mug|mugs','물병|보틀|water bottle|water bottles','보온병|thermos|insulated bottle|insulated bottles',
    '도시락통|lunch box|lunch boxes|bento box|bento boxes','밀폐 용기|반찬통|food storage container|food containers|food container',
    '조리 기구|cooking utensils','도마|cutting board|cutting boards','프라이팬|후라이팬|frying pan|frying pans|skillet|skillets','냄비|saucepan|saucepans|stockpot',
    '식기 세트|dinnerware|dishware','접시|dinner plate|dinner plates','그릇|serving bowl|cereal bowl|mixing bowl','수저 세트|커트러리|cutlery|flatware','식기 건조대|dish rack|dish drying rack',
    '주전자|kettle|kettles','에어 프라이어|air fryer|air fryers','전기 밥솥|rice cooker|rice cookers','커피 메이커|coffee maker|coffee machine','토스터|toaster|toasters',
    // 수납·욕실·청소·세탁
    '정리함|정리 박스|storage box|storage bins|storage bin','서랍 정리|drawer organizer|drawer organisers','정리 바구니|storage basket|storage baskets',
    '옷걸이|clothes hanger|coat hanger','빨래 바구니|laundry basket|laundry hamper','압축팩|vacuum storage bag|vacuum storage bags',
    '샤워기|샤워 헤드|shower head|shower heads','비누 받침|soap dish','비누 디스펜서|soap dispenser','수건|타월|towel|towels','욕실 매트|발매트|bath mat|bath mats',
    '빗자루|broom|brooms','밀대|대걸레|floor mop|mop|mops','청소기|vacuum cleaner|vacuum cleaners|robot vacuum|cordless vacuum',
    '세탁 세제|laundry detergent','섬유 유연제|fabric softener','주방 세제|dish soap|dishwashing liquid','수세미|dish sponge|dish brush',
    // 가구·침구·조명·생활 가전
    '책상|desk|desks','책장|bookcase|bookcases|bookshelf|bookshelves','서랍장|dresser|chest of drawers','의자|게이밍 체어|gaming chair|dining chair|office chair|folding chair',
    '소파|sofa|sofas|couch','사이드 테이블|side table|coffee table|nightstand','테이블 매트|placemat|placemats','커튼|curtain|curtains','카펫|러그|area rug|rugs',
    '베개|pillows|pillow|pillowcase|pillowcases','이불|침대 시트|bed sheets|bed sheet|duvet|duvets|comforter|blanket|blankets',
    '무드등|수면등|탁상 조명|night light|desk lamp|floor lamp','LED 조명|LED 전구|LED 스트립|LED 조명등|led light strip|led strip lights|led light bulb|led lights',
    '향초|scented candle|candles','벽걸이 거울|wall mirror','공기 청정기|air purifier|air purifiers','가습기|humidifier|humidifiers',
    '제습기|dehumidifier|dehumidifiers','탁상용 선풍기|desk fan|desk fans','휴대용 선풍기|handheld fan|handheld fans','전기 장판|전기 담요|electric blanket|heated blanket',
    '휴대폰 거치대|핸드폰 거치대|phone stand|phone holder','케이블 정리|cable organizer|cable clips','무선 충전기|wireless charger|charging pad',
    '여행용 정리백|packing cubes|packing cube','휴대용 보조 배터리|보조 배터리|power bank|portable charger'
  ].map(group=>group.split('|'));
  const livingFeature=/보온\s*유지|보냉\s*유지|식기세척기\s*사용\s*가능|높이\s*조절|접이식|물샘\s*방지|\bdishwasher[ -]safe\b|\bleak[ -]?proof\b|\bheight[ -]adjustable\b|\bkeeps (?:my |your )?drinks? (?:hot|cold)\b/u;
  const beautyTerms=topics.beauty[1].split('|');
  const livingTerms=[...new Set([...topics.home[1].split('|'),...livingAliases.flat()])];
  function livingClue(text){
    const context=text.replace(/\b(?:(?:cloud|phone|icloud|digital)\s+storage|pillow\s+talk|ceramic\s+(?:skin|hair\s+straightener|curling\s+iron)|led\s+(?:lights?\s+)?(?:face\s+mask|therapy\s+mask))\b|도마저/gu,' ');
    return firstTerm(context,livingTerms);
  }

  // Aliases identify the same kind of product in captions, hashtags and keyword searches.
  const shakeNames='프로틴 쉐이크|프로틴 셰이크|프로틴 쉐익|단백질 쉐이크|단백질 셰이크|단백질 음료|프로틴 드링크|protein shake|protein shakes|protein drink|protein drinks|whey shake|whey shakes'.split('|');
  const gummyNames='비타민 젤리|비타민 구미|구미 비타민|vitamin gummy|vitamin gummies|vitamin jelly|vitamin jellies|gummy vitamins'.split('|');
  const nutritionGroups=[
    shakeNames,gummyNames,
    '단백질 파우더|프로틴 파우더|단백질 보충제|유청 단백질|protein powder|whey protein|plant protein powder'.split('|'),
    '단백질 바|프로틴 바|프로틴 스낵|단백질 간식|protein bar|protein bars|protein snack|protein snacks'.split('|'),
    '식사 대용|대용식|밀 리플레이스먼트|meal replacement|meal replacements'.split('|'),
    '영양제|보충제|dietary supplement|dietary supplements|herbal supplement|herbal supplements'.split('|'),
    '멀티 비타민|종합 비타민|multi vitamin|multi vitamins'.split('|'),
    '프로바이오틱스|유산균|probiotic|probiotics'.split('|'),
    '프리바이오틱스|prebiotic|prebiotics'.split('|'),
    '오메가 3|omega 3|fish oil|피시 오일'.split('|'),
    '전해질 음료|electrolyte drink|electrolyte powder|electrolyte mix'.split('|'),
    '애플 사이다 비니거|애사비|apple cider vinegar|acv'.split('|'),
    '홍삼|red ginseng'.split('|'),
    '단백질 보충|분리 유청|protein supplement|protein supplements|vegan protein|plant based protein'.split('|'),
    '이너 뷰티|먹는 콜라겐|콜라겐 펩타이드 분말|collagen peptides powder|collagen drink'.split('|'),
    '마시는 식초|식초 음료|vinegar drink|vinegar shot'.split('|'),
    '저당 간식|무가당 음료|고단백 간식|high protein snack|low sugar snack|sugar free gummies'.split('|'),
    '차전자피|psyllium husk|fiber supplement|fibre supplement'.split('|')
  ];
  const organicNames=['유기농','유기 재배','오가닉','organic','usda organic'];
  const dietaryLabels=[...organicNames,...'무농약|무가당|저당|저염|고단백|고식이섬유|식물성|통곡물|글루텐 프리|plant based|whole grain|wholegrain|gluten free|high fiber|high fibre|high protein|low sodium|low sugar|unsweetened|no added sugar|sugar free'.split('|')];
  const healthTerms=[...new Set([...nutritionGroups.flat(),...topics.health[1].split('|')])];
  const edibleForms='젤리|구미|스틱|캡슐|정제|츄어블|사탕|분말|음료|주스|주스샷|허브차|보리차|티백|시리얼|오트밀|귀리|현미|백미|쌀|통밀|견과바|시금치|당근|토마토|양배추|시리얼바|올리브오일|코코넛오일|오일|그래놀라|곡물|견과|채소|과일|사과|블루베리|딸기|바나나|브로콜리|두부|아이스크림|치아씨드|우유|두유|요거트|커피|말차|녹차|꿀|간식|식재료|식품|먹거리|juice|juices|oats|oatmeal|granola|cereal|ice cream|rice|nuts|almonds|almond butter|peanut butter|coconut oil|olive oil|seeds|tofu|strawberries|banana|broccoli|carrots|beans|whole wheat bread|pasta|cookies|crackers|bars|bar|smoothies|smoothie|produce|vegetables|fruit|berries|blueberries|apple|apples|milk|yogurt|yoghurt|coffee|matcha|tea|honey|snack|snacks|foods|food|groceries|grocery|gummy|gummies|jelly|jellies|capsule|capsules|tablets|tablet|chewable|chewables|softgels|softgel|drink|drinks|powder|shots|shot|pouches|pouch'.split('|');
  const nutrientNames='비타민|콜라겐|마그네슘|철분|아연|칼슘|밀크씨슬|루테인|식이섬유|크레아틴|전해질|비오틴|vitamin|vitamins|collagen|magnesium|iron|zinc|calcium|milk thistle|lutein|fiber|fibre|creatine|electrolyte|electrolytes|biotin'.split('|');
  const edibleCream=/ice[\s_-]*cream|아이스크림|sour cream|cream cheese|whipped cream/gu;
  const topicalOrHousehold=/세럼|앰플|크림|샴푸|헤어\s*팩|마스크팩|스킨케어|화장품|화장솜|아이섀도|립밤|클렌저|코튼|침구|수건|세제|모이스처라이저|패드|로션|선크림|비누|티셔츠|면봉|팩트|serum|ampoule|cream(?!er)|shampoo|mask|skin\s*care|lotion|cleanser|makeup|eyeshadow|balm|moisturi[sz]er|toner|sunscreen|cotton|linen|bedding|detergent|towel|apparel|fabric|soap|t.shirt|follower|traffic|organic reach|hair treatment/u;
  const intake=/마셔\s*봤|마셔\s*본|마셨어|마시고\s*있|타\s*먹|타\s*마|챙겨\s*먹|먹어\s*본|먹고\s*있|섭취했|섭취해|시음해|\bi (?:drank|tasted|blended|drink)\b|\bi take (?:these|my|two)\b/u;
  const nutritionFeature=/신제품|새로운\s*맛|신상\s*맛|신맛 출시|저당|무가당|단백질\s*\d+(?:\.\d+)?\s*g|\d+(?:\.\d+)?\s*g\s*(?:of\s+)?protein\b|\bnew(?:\s+[a-z]+){0,4}\s+flavou?rs?\b|\b(?:low sugar|no added sugar)\b/u;
  const termMatchers=new WeakMap();
  function tokenPattern(term){
    const literal=term.replace(/[.*+?^$\x7b\x7d()|[\]\\]/g,'\\$&').replace(/[-\s]+/g,'[-\\s_]*');
    return (/^[a-z0-9]/i.test(term)?'(?<![a-z0-9])':'')+literal+(/[a-z0-9]$/i.test(term)?'(?![a-z0-9])':'');
  }
  function firstTerm(text,terms){
    if(!termMatchers.has(terms))termMatchers.set(terms,new RegExp(terms.map(tokenPattern).join('|'),'iu'));
    return text.match(termMatchers.get(terms))?.[0];
  }
  const compactForms=edibleForms.filter(term=>/^[a-z ]+$/.test(term)).map(t=>t.replaceAll(' ','')).join('|');
  const joinedProduct=new RegExp('(?<![a-z0-9])(?:organic|usdaorganic|unsweetened|plantbased|highprotein|glutenfree|lowsugar|collagen|(?:multi)?vitamin(?:b(?:12|6)?|c|d3?|e)?|magnesium|zinc|electrolyte|probiotic|applecidervinegar)(?:'+compactForms+')(?![a-z0-9])','iu');
  const healthCache=new Map();
  function nutritionClue(text){
    if(healthCache.has(text))return healthCache.get(text);
    let found=null;
    for(const clause of text.split(/[.!?。！？;,\n]+|\s+(?:and|그리고|및)\s+/u)){
      if(!clause.trim()||topicalOrHousehold.test(clause.replace(edibleCream,'')))continue;
      found=firstTerm(clause,healthTerms)||clause.match(joinedProduct)?.[0];
      if(!found){
        const descriptor=firstTerm(clause,dietaryLabels)||firstTerm(clause,nutrientNames);
        const edible=descriptor&&(firstTerm(clause,edibleForms)||intake.test(clause)||/유기농\s*차(?:$|[\s를가도와])/u.test(clause));
        if(edible)found=descriptor;
      }
      if(found)break;
    }
    if(healthCache.size>=600)healthCache.delete(healthCache.keys().next().value);
    healthCache.set(text,found||null);
    return found||null;
  }
  const modes={
    store:['매장 홍보','매장 방문|매장 투어|스토어 투어|쇼룸 방문|가게 방문|매장 오픈|매장 위치|매장 주소|영업시간|찾아가는 길|입구|예약 방법|예약 링크|가는 방법|다녀왔|방문했|들렀|새로 오픈|store tour|store visit|visited|stopped by|went to|shop with me|come with me to|grand opening|store hours|opening hours|entrance|directions'],
    product:['제품 홍보','사용해|써봤|써본|써보|사용법|사용 후기|언박싱|착용|발색|먹어봤|맛봤|시식|조립|설치해|사용 전후|리뷰|제품 소개|unboxing|unbox|review|reviews|swatch|swatches|tried|trying|try-on|installed|how to use|how i use|taste test|first impressions|before and after|demo|testing|tested|swatched|wear test|first impression|사용감|써보니|발라봤|발라본|색상을 바꿀|색상을 조절|온도 조절|배터리 지속|adjustable brightness|battery lasts|change the color|change the colour|turn the lights into any color']
  };
  const focus={
    store:'매장·팝업 방문, 위치·이용 방법 등 방문객에게 알려준 내용을 봐요.',
    product:'제품을 직접 사용하거나 맛본 경험, 구체적으로 소개한 기능·특징을 봐요.'
  };
  const synonyms=['광동|kwangdong|kwang dong','케이팝|K팝|K-pop|Kpop','포토카드|photocard|photocards','팝업|팝업스토어|pop-up|popup|pop up','로스앤젤레스|los angeles|엘에이|LA','코리아타운|한인타운|koreatown|k-town|ktown'].map(x=>x.split('|')).concat(nutritionGroups,livingAliases,[organicNames]);
  const vitaminTypes=['c','d','d3','b','b12'];
  const typedGummies=vitaminTypes.flatMap(type=>['vitamin '+type+' gummy','vitamin '+type+' gummies','vitamin '+type+' jelly','비타민 '+type+' 젤리','비타민 '+type+' 구미']);
  const venues='store|shop|mall|market|showroom|boutique|pop-up|popup|gallery|cafe|restaurant|flagship|매장|스토어|가게|샵|숍|팝업|쇼룸|마켓|카페|식당|갤러리'.split('|');
  const needsVenue=new Set('다녀왔|방문했|들렀|새로 오픈|visited|stopped by|went to|come with me to|grand opening|영업시간|찾아가는 길|입구|예약 방법|예약 링크|가는 방법|opening hours|entrance|directions'.split('|'));
  const needsProduct=new Set('리뷰|착용|review|reviews|tried|trying|try-on|installed|first impressions|first impression|before and after|demo|testing|tested|색상을 바꿀|색상을 조절|온도 조절|배터리 지속|adjustable brightness|battery lasts|change the color|change the colour|turn the lights into any color'.split('|'));
  const productObjects=[
    ...'식품|간식|젤리|시식|음식|디저트|먹방|과자|음료|푸드|스낵|snack|snacks|jelly|gummy|gummies|food|foodie|tasting|dessert|drink|grocery|meal|candy'.split('|'),
    ...healthTerms,
    ...livingTerms,
    ...Object.values(topics).flatMap(([,terms])=>terms.split('|')),
    ...'제품|상품|틴트|크림|샴푸|기기|게이밍 체어|마이크|핸드크림|접시|product|supplement|supplements|palette|chair|microphone|flavor|flavour|spicy version|cream|shampoo|lotion|lamp|phone|headphones|backpack|lip balm|음반|앨범|포토카드|굿즈|photocard|album|merch'.split('|')
  ];
  function thumbnailText(text){
    // TikTok can prefix an alt with the creator and audio title. Keep the post description.
    return (text||'').replace(/^.{1,220}?님이[\s\S]{1,420}?\(으\)로 만든(?:\s+|$)/u,'').trim();
  }
  const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[‐‑–—]/g,'-');
  const patterns=new Map();
  function termIndex(txt,term){
    const t=norm(term).trim();if(!t)return -1;
    if(!patterns.has(t)){
      const prefix=t==='식품'?'(?<!건강)(?<!건강기능)':'';
      if(patterns.size>700)patterns.clear();
      patterns.set(t,new RegExp(prefix+tokenPattern(t),'iu'));
    }
    return txt.search(patterns.get(t));
  }
  const keywordKey=s=>norm(s).trim().replace(/^#/,'').replace(/[-_\s]+/g,'');
  const has=(text,term)=>termIndex(text,term)>=0;
  const integer=x=>Number.isSafeInteger(x)&&x>=0?x:null;
  function parseCount(v){
    if(typeof v==='number')return integer(v);
    const m=String(v??'').normalize('NFKC').trim().match(/^(\d+(?:[.,]\d+)*)(?:\s*([kmb천만억]))?\s*(?:회|개|명)?$/i);if(!m)return null;
    let num=m[1],unit=m[2]?.toLowerCase();
    if(/^\d{1,3}(,\d{3})+$/.test(num))num=num.replaceAll(',','');
    else if(unit&&/^\d+,\d{1,2}$/.test(num))num=num.replace(',','.');
    else if(!(unit?/^\d+(?:\.\d+)?$/:/^\d+$/).test(num))return null;
    return integer(Math.round(Number(num)*({k:1e3,m:1e6,b:1e9,천:1e3,만:1e4,억:1e8}[unit]||1)));
  }
  const ad=s=>/#(?:광고|협찬|유료광고|제품제공|제품협찬|유료협찬|ad|ads|sponsored|gifted|partner)(?![\w가-힣])|\b(?:paid partnership|sponsored by|gifted by)\b|유료\s*(?:광고|파트너십)|제품을?\s*제공\s*받/iu.test(s||'');
  const DAY=86400000;
  const KST=9*3600000;
  function date(timestamp){
    const shifted=new Date(Number.isFinite(timestamp)?timestamp+KST:NaN);
    return Number.isFinite(shifted.getTime())?shifted.toISOString().slice(0,10):'날짜 미확인';
  }
  function validDay(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const parsed=new Date(value+'T00:00:00Z');
    return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
  }
  const presetNames={'7':'최근 7일','30':'최근 1개월 (30일)','90':'최근 90일'};
  function resolvePeriod(selection='all',now=Date.now()){
    if(selection==='all')return {label:'읽은 게시물 전체'};
    let start,end,title;
    if(typeof selection==='object'&&selection?.type==='custom'){
      ({start,end}=selection);
      title='직접 설정';
      if(!validDay(start)||!validDay(end))return {error:'시작일과 종료일을 모두 입력해 주세요.'};
      if(start>end)return {error:'종료일을 시작일과 같거나 늦게 선택해 주세요.'};
    }else if(Object.hasOwn(presetNames,selection)){
      title=presetNames[selection];
      start=date(now-(Number(selection)-1)*DAY);
      end=date(now);
    }else{
      return {error:'집계 기간을 선택해 주세요.'};
    }
    return {start,end,label:title+' · '+start+' ~ '+end+' (한국시간)'};
  }
  const fmt=n=>Number.isFinite(n)?n.toLocaleString('ko-KR',{maximumFractionDigits:1}):'미확인';

  // Retrieval terms only; matching one never establishes campaign suitability.
  const reviewAliases=[
    '세럼|serum','샴푸|shampoo','두피|scalp','스킨케어|skincare|skin care',
    '선크림|자외선 차단제|sunscreen','립틴트|lip tint','보습제|moisturizer|moisturiser',
    '클렌저|cleanser','토너|toner','마스크팩|sheet mask','핸드크림|hand cream',
    '차분한|calm','사용 후기|review|reviews','매장 방문|store visit|store tour',
    '촬영|shoot|filming','협업|collaboration|partnership','경쟁 브랜드|competing brand'
  ].map(s=>s.split('|'));
  function reviewTerms(value){
    const text=norm(value),parts=text.split(/[·,;；，|\/\n()]/u).map(s=>s.trim()).filter(Boolean);
    const stop=new Set('제품 매장 브랜드 홍보 필수 조건 the and for with of a an to in product brand'.split(' '));
    const words=(text.match(/[\p{L}\p{N}_-]+/gu)||[]).filter(s=>s.length>1&&!stop.has(s));
    const aliases=[...synonyms,...reviewAliases].filter(g=>g.some(t=>has(text,t))).flat();
    return [...new Set([...parts.filter(s=>!stop.has(s)),...aliases,...words])].filter(s=>s.length>1).slice(0,100);
  }

  function campaign(c={}){const legacy=!Object.hasOwn(c,'product')&&!Object.hasOwn(c,'store');return {mode:Object.hasOwn(modes,c.mode)?c.mode:'store',fields:[...new Set((Array.isArray(c.fields)?c.fields:[]).map(k=>k==='food'?'health':k).filter(k=>Object.hasOwn(topics,k)))],terms:String(c.terms||'').slice(0,180),brief:String(c.brief||'').slice(0,160),target:String(c.target||'').slice(0,120),product:String(c.product||(legacy&&c.mode==='product'?c.brief:'')||'').slice(0,160),store:String(c.store||(legacy&&c.mode!=='product'?c.brief:'')||'').slice(0,160),brand:String(c.brand||'').slice(0,120),brandValues:String(c.brandValues||'').slice(0,240),requirements:String(c.requirements||'').slice(0,240)};}
  function group(posts,key){const vals=posts.map(p=>p[key]).filter(Number.isFinite).sort((a,b)=>a-b),n=vals.length;return {n,total:posts.length,value:n?(vals[(n-1)>>1]+vals[n>>1])/2:null};}
  function rate(p,followers){
    if(!Number.isFinite(followers)||followers<=0||integer(p.likes)===null||integer(p.comments)===null)return null;
    return (p.likes+p.comments)/followers*100;
  }
  function viewRate(post){
    if(!post.reel || !Number.isFinite(post.views) || post.views<=0)return null;
    if([post.likes,post.comments,post.shares].some(value=>integer(value)===null))return null;
    return (post.likes+post.comments+post.shares)/post.views*100;
  }
  const percent=n=>Number.isFinite(n)?(n>0&&n<0.01?'<0.01%':n.toLocaleString('ko-KR',{maximumFractionDigits:2})+'%'):'미확인';
  function actionText(text, mode){
    if(mode!=='product')return text;
    // A question to the reader or an attempt to do something is not personal product use.
    return text.replace(/\b(?:(?:have|had)\s+you(?:\s+ever)?\s+tried|(?:trying|tried)\s+to)\b/giu,' ');
  }
  function signals(source,mode,otherSources) {
    const terms=modes[mode][1].split('|');
    const actions=new Set();
    const places=new Set();
    const text=actionText(source.normal,mode);
    for(const phrase of text.split(/[.!?。！？\n]+/u)){
      if(!phrase.trim())continue;
      if(mode==='product'&&source.home){
        const feature=phrase.match(livingFeature);
        if(feature)actions.add(feature[0]);
      }
      if(mode==='product'&&source.health&&!topicalOrHousehold.test(phrase.replace(edibleCream,''))){
        const cue=phrase.match(nutritionFeature)||phrase.match(intake);
        if(cue)actions.add(cue[0]);
      }
      const venue=mode==='store'&&venues.find(term=>has(phrase,term));
      if(venue)places.add(venue);
      for(const term of terms){
        if(!has(phrase,term))continue;
        if(mode==='store'&&needsVenue.has(term)&&!venue)continue;
        if(mode==='product'&&needsProduct.has(term)){
          const refersToItem=/\b(?:it|this|these|them)\b|이걸|이거|이 제품/u.test(phrase);
          const context=refersToItem?[phrase,...otherSources.map(s=>s.normal)]:[phrase];
          if(!context.some(line=>firstTerm(line,productObjects)||nutritionClue(line)))continue;
        }
        actions.add(term);
      }
    }
    return {...source,actions:[...actions],places:[...places]};
  }
  function measure(posts,followers){
    const reels=posts.filter(p=>p.reel);
    return {er:group(posts.map(p=>({value:rate(p,followers)})),'value'),
      all:group(reels,'views'),ad:group(reels.filter(p=>p.ad),'views'),other:group(reels.filter(p=>!p.ad),'views'),
      likes:group(posts,'likes'),comments:group(posts,'comments'),shares:group(posts,'shares'),saves:group(posts,'saves'),viewEr:group(reels.map(p=>({value:viewRate(p)})),'value')};
  }
  function metricView(result,scope='account'){
    return scope==='related'?{...result,...result.relatedMetrics,metricPosts:result.relatedPosts,metricLabel:'관련 게시물'}:result;
  }
  function results(data,c,period='all',now=Date.now()){
    // A visible post may have a verified transcription even when its API caption is absent.
    const transcripts=new Map();
    for(const pick of [...(data.picks?.store||[]),...(data.picks?.product||[])]){
      if(pick.detail?.wrongOwner||(!pick.screen&&!pick.quote))continue;
      const old=transcripts.get(pick.id)||{};
      transcripts.set(pick.id,{screen:pick.screen||old.screen,quote:pick.quote||old.quote});
    }
    const range=resolvePeriod(period,now);
    let unknownDates=0;
    const posts=data.posts.filter(post=>{
      const day=date(post.date);
      if(day==='날짜 미확인')unknownDates++;
      if(range.error)return false;
      return !range.start||(day!=='날짜 미확인'&&range.start<=day&&day<=range.end);
    });
    const observed=posts.map(post=>{
      const transcribed=transcripts.get(post.id);
      if(!transcribed)return post;
      return {...post,screen:transcribed.screen,caption:post.caption||transcribed.quote,copiedCaption:!post.caption&&!!transcribed.quote};
    });
    const original = new Map(data.posts.map(post => [post.id,post]));
    const saved = (data.picks?.[c.mode] || []).map(item => {
      const captured = {...item.detail, ...original.get(item.id)};
      const copiedCaption = !captured.caption && !!item.quote;
      return {...captured, id:item.id, url:item.url, reel:!!(captured.reel || item.reel),
        date:captured.date ?? (item.day ? Date.parse(item.day + 'T00:00:00+09:00') : null),
        caption:captured.caption || item.quote || '', screen:item.screen||transcripts.get(item.id)?.screen||'', copiedCaption, dateEntered:captured.date == null && !!item.day,
        chosen:true, note:item.note || '', wrongOwner:!!item.detail?.wrongOwner && !original.has(item.id)};
    });
    const picked = saved.filter(post => {
      const day = date(post.date);
      return !range.error && !post.wrongOwner && (!range.start || (range.start <= day && day <= range.end));
    });
    const terms=c.terms.split(/[,，;\n]/).map(x=>x.trim()).filter(Boolean).flatMap(t=>{
      const group=synonyms.find(g=>g.some(s=>keywordKey(s)===keywordKey(t)));
      return group===gummyNames?[...gummyNames,...typedGummies]:group||[t];
    });
    const matches=[],partial=[],scopedPosts=[];
    for(const p of observed){
      const sources=[[p.copiedCaption?'직접 옮긴 캡션':'캡션',p.caption],['썸네일 설명',thumbnailText(p.alt)],['직접 옮긴 화면 문구',p.screen]].filter(([,text])=>text).map(([label,text])=>({label,text,normal:norm(text)}));
      if(!sources.length)continue;
      for(const source of sources){
        source.health=nutritionClue(source.normal);
        source.home=livingClue(source.normal);
      }
      const hits=terms=>terms.filter(term=>sources.some(s=>has(s.normal,term)));
      const health=sources.map(source=>source.health).filter(Boolean);
      const living=sources.map(source=>source.home).filter(Boolean);
      const fields=c.fields.flatMap(k=>k==='health'?health:k==='home'?living:hits(topics[k][1].split('|')));
      if(c.fields.length&&!fields.length)continue;
      if(c.fields.length)scopedPosts.push(p);
      const extra=hits(terms);
      if(terms.length&&!extra.length)continue;
      const clues=c.fields.length?fields:c.mode==='product'?[...health,...living,...sources.map(source=>firstTerm(source.normal,beautyTerms)).filter(Boolean)]:[];
      const actionSources=sources.map(source=>signals(source,c.mode,sources.filter(other=>other!==source)));
      const actions=[...new Set(actionSources.flatMap(source=>source.actions))];
      const places=actionSources.flatMap(source=>source.places);
      const used=new Map(),why=[];
      function describe(kind,found,pool=sources) {
        if(!found.length)return;
        const term=found[0],source=pool.find(s=>has(s.normal,term));
        used.set(source.label,source);why.push(kind+' ‘'+term+'’ ('+source.label+')');
      }
      if(actions.length){
        const term=actions[0],source=actionSources.find(s=>s.actions.includes(term));
        used.set(source.label,source);why.push((c.mode==='store'?'방문·이용 안내 표현':'제품 사용·소개 표현')+' ‘'+term+'’ ('+source.label+')');
      }else if(places.length){describe('장소 언급',places);}
      describe('분야',clues);describe('지정어',extra);
      let keywordHit;
      if(extra.length){
        const matched=sources.find(source=>has(source.normal,extra[0]));
        const direct=termIndex(matched.text,extra[0]);
        const at=direct>=0?direct:termIndex(matched.normal,extra[0]);
        keywordHit={label:matched.label,at};
      }
      const item={post:p,keywordHit,source:[...used.values()].map(s=>s.label).join(' + '),excerpt:[...used.values()].map(s=>s.text).join(' / '),reason:why.join(' · '),
        weight:Math.min(4,fields.length)+Math.min(4,actions.length)+Math.min(3,extra.length)};
      if(actions.length)matches.push(item);else if(clues.length||extra.length||places.length)partial.push(item);
    }
    const sort=(a,b)=>b.weight-a.weight||(b.post.date||0)-(a.post.date||0)||a.post.id.localeCompare(b.post.id);
    const metricPosts=c.fields.length?scopedPosts:observed;
    const metricLabel=c.fields.map(k=>topics[k][0]).join('·')||'전체';
    const autoIds = new Set([...matches,...partial].map(item => item.post.id));
    const pickedOnly = picked.filter(post => !autoIds.has(post.id));
    // The metric sample is exactly the visible related list, including manual picks.
    const relatedMap=new Map([...matches,...partial].map(item=>[item.post.id,item.post]));
    for(const post of picked)relatedMap.set(post.id,post);
    const relatedPosts=[...relatedMap.values()];
    const relatedCount=relatedPosts.length;
    const relatedMetrics=measure(relatedPosts,data.followers);
    const readable=observed.filter(p=>p.caption||p.screen||thumbnailText(p.alt)).length;
    return {posts:observed,metricPosts,metricLabel,picked,pickedOnly,relatedPosts,relatedMetrics,relatedCount,range,unknownDates,hasKeywords:terms.length>0,captions:posts.filter(p=>p.caption).length,alts:posts.filter(p=>p.alt).length,matches:matches.sort(sort),partial:partial.sort(sort),texts:readable,...measure(metricPosts,data.followers)};
  }
  const name=c=>[modes[c.mode][0],c.fields.map(k=>topics[k][0]).join('·'),c.terms].filter(Boolean).join(' / ');
  function coverage(result){
    return '게시일 미확인 '+result.unknownDates+'건 '+(result.range.start?'제외':'포함');
  }
  function summary(raw,c,r){
    const line=x=>x.reason+' | '+x.excerpt.slice(0,180)+' | '+x.post.url;
    return ['@'+raw.user+' · TikTok',name(c),...(c.target.trim()?['GPT 검토용 타깃·지역 · '+c.target.trim()]:[]),
      ...[['제품',c.product],['매장',c.store],['브랜드',c.brand],['브랜드 특징',c.brandValues],['필수조건',c.requirements]].filter(([,value])=>value?.trim()).map(([label,value])=>'적합도 검토 '+label+' · '+value),
      r.range.label+' · 게시물 '+r.posts.length+'건 · '+coverage(r)+' · 확인일 '+date(raw.at),
      '계정 지표 범위 · '+r.metricLabel+' 게시물 '+r.metricPosts.length+'건 / 기간 내 읽은 '+r.posts.length+'건',
      '팔로워 '+fmt(raw.followers)+(raw.followerSource==='manual'?' (직접 입력)':'')+' · 팔로워 대비 게시물 반응률 중앙값 '+percent(r.er.value)+' ('+r.er.n+'/'+r.er.total+'건)',
      '반응률은 확인한 게시물별 (좋아요 + 댓글) ÷ 현재 팔로워 수 × 100의 중앙값입니다. 분야와 게시 기간은 계정 지표에도 적용됩니다.',
      '검토 기준 · '+focus[c.mode],
      '영상 조회수 중앙값 '+fmt(r.all.value)+' ('+r.all.n+'/'+r.all.total+'건)',
      '영상 조회수 대비 반응률 중앙값 '+percent(r.viewEr.value)+' ('+r.viewEr.n+'/'+r.viewEr.total+'건) · (좋아요+댓글+공유) ÷ 조회수 × 100',
      '공유 중앙값 '+fmt(r.shares.value)+' ('+r.shares.n+'/'+r.shares.total+'건) · 저장 중앙값 '+fmt(r.saves.value)+' ('+r.saves.n+'/'+r.saves.total+'건)',
      '협찬 표기 영상 '+fmt(r.ad.value)+' ('+r.ad.n+'건) / 표기 미확인 영상 '+fmt(r.other.value)+' ('+r.other.n+'건)',
      '좋아요 중앙값 '+fmt(r.likes.value)+' ('+r.likes.n+'건) · 댓글 중앙값 '+fmt(r.comments.value)+' ('+r.comments.n+'건)',
      '관련 게시물 지표 범위 · '+r.relatedCount+'건 (표현 확인·후보·직접 선정, 중복 제외)',
      ...Object.entries(r.relatedMetrics).filter(([k])=>['er','all','likes','comments','shares','saves','viewEr'].includes(k)).map(([k,g])=>
        '관련 게시물 '+({er:'팔로워 대비 반응률',all:'영상 조회수',likes:'좋아요',comments:'댓글',shares:'공유',saves:'저장',viewEr:'조회수 대비 반응률'}[k])+' 중앙값 '+(['er','viewEr'].includes(k)?percent(g.value):fmt(g.value))+' ('+g.n+'/'+g.total+'건 확인)'),
      ...(r.relatedCount>0&&r.relatedCount<5?['관련 게시물 표본이 적어 계정 전체 경향으로 일반화할 수 없습니다.']:[]),
      '홍보 방식 표현 확인 '+r.matches.length+'건',...r.matches.slice(0,8).map(line),
      '관련 후보 중 홍보 방식 추가 확인 '+r.partial.length+'건',...r.partial.slice(0,4).map(line),
      ...(r.picked.length?['직접 선정 '+r.picked.length+'건 (자동 결과와 겹친 '+(r.picked.length-r.pickedOnly.length)+'건 포함)',...r.picked.map(p=>[p.url,p.copiedCaption?'직접 옮긴 캡션':p.caption?'캡션':'원문 텍스트 미확인',p.caption?.slice(0,220),p.screen?'직접 옮긴 화면 문구 · '+p.screen:'',p.note?'선정 메모 · '+p.note:''].filter(Boolean).join(' | '))]:[]),
      '영상 장면·시청자 지역·방문·주문 성과는 별도 확인.'].join('\n');
  }
  function csv(raw,c,r,metricsOnly=false,scope='account'){
    r=metricView(r,scope);
    const by=new Map([...r.matches.map(x=>[x.post.id,'홍보 방식 표현 확인 · '+x.reason]),...r.partial.map(x=>[x.post.id,'관련 후보 · '+x.reason])]);
    const quote=v=>{let s=String(v??'');if(/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
    const exported=new Map(r.metricPosts.map(p=>[p.id,p]));
    if(!metricsOnly)for(const p of r.picked)exported.set(p.id,p);
    const metricIds=new Set(r.metricPosts.map(post=>post.id));
    const rows=[...exported.values()].map(p=>[raw.user,name(c),p.dateEntered?'':Number.isFinite(p.date)?new Date(p.date).toISOString().slice(0,10):'날짜 미확인',p.reel?'영상':'사진',p.ad?'확인':'미확인',p.views,p.viewsRaw,p.likes,p.comments,raw.followers,raw.followerSource==='manual'?'직접 입력':Number.isFinite(raw.followers)?'프로필':'미확인',rate(p,raw.followers),metricIds.has(p.id)?r.metricLabel:'직접 선정 · 지표 제외',by.get(p.id),p.url,p.caption,p.alt,p.screen,date(p.date),r.range.label,p.chosen?'직접 선정':'',p.note,p.copiedCaption?'직접 옮긴 캡션':'',p.shares,p.saves,viewRate(p)]);
    return '\uFEFF'+[['계정','캠페인','날짜(UTC)','형식','협찬 표기','조회수','화면 표기','좋아요','댓글','팔로워','팔로워 출처','팔로워 대비 게시물 반응률(%)','계정 지표 집계 범위','근거','URL','캡션','썸네일 설명','직접 옮긴 화면 문구','게시일(한국시간)','집계 기간','직접 선정','선정 메모','캡션 입력 출처','공유','저장','영상 조회수 대비 반응률(%)'],...rows].map(row=>row.map(quote).join(',')).join('\r\n');
  }
  return {reviewTerms,termIndex,topics,modes,focus,thumbnailText,campaign,results,ad,date,fmt,parseCount,integer,name,resolvePeriod,validDay,coverage,measure,metricView,percent,rate,viewRate,summary,csv};
})();
