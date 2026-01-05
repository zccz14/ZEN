const { ZenBuilder } = require('./dist/builder');

async function testMultiLangBuild() {
  console.log('Testing multi-language build...\n');

  const builder = new ZenBuilder();

  try {
    await builder.buildMultiLang({
      srcDir: './docs',
      outDir: './.zen/dist',
      langs: ['zh-Hans', 'en-US'],
      verbose: true,
      useMetaData: true,
      filterOrphans: true,
    });

    console.log('\n✅ Multi-language build test completed successfully!');

    // 检查生成的文件
    const fs = require('fs');
    const path = require('path');

    const distDir = './.zen/dist';
    if (fs.existsSync(distDir)) {
      console.log('\n📁 Generated files:');
      const listFiles = (dir, indent = '') => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          console.log(`${indent}${item.name}${item.isDirectory() ? '/' : ''}`);
          if (item.isDirectory()) {
            listFiles(path.join(dir, item.name), indent + '  ');
          }
        }
      };
      listFiles(distDir);
    }
  } catch (error) {
    console.error('\n❌ Multi-language build test failed:', error);
    process.exit(1);
  }
}

testMultiLangBuild();
