/** DM 메인 스크롤 컨테이너 — 새 메시지 후 레이아웃이 한 프레임 늦게 잡히는 경우 대비 이중 스크롤 */
export function scrollDmChatPaneToBottom(el: HTMLDivElement | null): void {
  if (!el) return;
  el.scrollTop = el.scrollHeight;
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight;
  });
}
