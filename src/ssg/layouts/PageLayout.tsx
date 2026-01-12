import React from 'react';

export const PageLayout: React.FC<{
  header: React.ReactNode;
  navigator: React.ReactNode;
  main: React.ReactNode;
  footer: React.ReactNode;
}> = props => {
  return (
    // 100% 宽度，100% 高度，垂直方向排列
    <div className="flex flex-col w-full h-full overflow-hidden items-stretch">
      {/* Header 由自身高度决定 */}
      <header className="shrink-0">{props.header}</header>
      {/* 当宽度足够时，内容进行左右分栏 */}
      {/* 可伸缩的高度，超出的部分 scroll，左右对齐高度 */}
      <div className="flex flex-col overflow-auto md:flex-row flex-1 md:overflow-hidden md:items-stretch">
        {/* 宽度由自身决定 */}
        <nav className="md:overflow-auto md:shrink-0">{props.navigator}</nav>
        {/* 占据剩余宽度 */}
        <main className="md:flex-1 md:overflow-auto">{props.main}</main>
      </div>
      {/* Footer 由自身高度决定 */}
      <footer className="shrink-0">{props.footer}</footer>
    </div>
  );
};
