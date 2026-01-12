import React from 'react';
import { IRenderContext } from '../../types';

export const CZONHeader: React.FC<{ ctx: IRenderContext }> = props => {
  return (
    <header className="czon-header py-4 border-b">
      <h1 className="text-2xl font-bold px-6">
        <a href="index.html">CZON</a>
      </h1>
    </header>
  );
};
