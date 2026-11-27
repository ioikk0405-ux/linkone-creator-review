'use strict';
const ManualPicks = (() => {
  const limit = 10;
  function parse(input, user, demoPosts = []) {
    const tokens = input.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) throw Error('추가할 게시물 링크를 입력해주세요.');
    const links = new Map();
    for (const token of tokens) {
      const demo = demoPosts.find(post => token.startsWith('#sample-') && post.url === token);
      const link = demo || (/^https?:\/\//i.test(token) && IGReader.link(token));
      if (!link || link.id.length > 90) throw Error('피드 또는 릴스의 원문 링크를 확인해주세요. 입력값: ' + token.slice(0, 75));
      if (link.owner && link.owner !== user) throw Error('@' + link.owner + '의 링크예요. @' + user + '의 게시물만 추가해주세요.');
      links.set(link.id, {id:link.id, url:link.url, reel:!!link.reel});
    }
    return [...links.values()];
  }
  function change(existing, action) {
    if (action.type === 'add') {
      const ids = new Set(existing.map(item => item.id));
      const fresh = action.links.filter(item => !ids.has(item.id));
      if (fresh.length + existing.length > limit)
        throw Error('최대 10개까지 저장할 수 있어요. 새 링크를 ' + (limit - existing.length) + '개 이하로 입력해주세요.');
      return [...existing, ...fresh.map(item => ({...item, addedAt: Date.now()}))];
    }
    const item = existing.find(item => item.id === action.id);
    if (!item) return existing;
    if (action.type === 'remove') return existing.filter(row => row !== item);
    if (action.type === 'read' && item.addedAt === action.addedAt)
      return existing.map(row => row === item ? {...row, detail:action.detail} : row);
    if (action.type === 'edit') {
      const {day='', quote='', screen=item.screen||'', note=''} = action;
      if (day && !CreatorReview.validDay(day)) throw Error('원문에서 확인한 게시일을 입력해주세요.');
      return existing.map(row => row === item ? {...row, day, quote:quote.trim().slice(0,640), screen:screen.trim().slice(0,320), note:note.trim().slice(0,300)} : row);
    }
    return existing;
  }
  return {limit, parse, change};
})();
