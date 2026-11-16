// 웹앱 빌드(vite build) 뒤에 바탕화면 위젯 exe 를 dist 에 같이 넣는다. 캘린더의 「바탕화면 위젯」 버튼이 받게 한다.
// - desktop-widget/dist 에서 가장 높은 버전의 TimeKeeper-캘린더-위젯-*.exe 를 dist/timekeeper-widget.exe 로 복사
// - 버전 · 크기는 dist/timekeeper-widget.json 에 (버튼이 이걸 보고 받을 수 있는지 안다)
// - exe 는 100MB 가 넘어 GitHub 에 못 올라가므로 .gitignore 에 넣어 두었다 (서버에 올리는 dist 에만 들어간다)
// 위젯을 아직 빌드하지 않았으면 경고만 하고 넘어간다 (웹앱 빌드는 실패시키지 않는다)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const from_dir = path.join(root, 'desktop-widget', 'dist');
const out_dir = path.join(root, 'dist');

// --check: 빌드 전에 dist 의 위젯 exe 가 실행 중인지 본다. 실행 중이면 vite 가 dist 를 비우다 EBUSY 로 실패하니 미리 알려 준다
if (process.argv.includes('--check')) {
  const exe = path.join(out_dir, 'timekeeper-widget.exe');
  if (fs.existsSync(exe)) {
    try {
      fs.closeSync(fs.openSync(exe, 'r+'));
    } catch (e) {
      if (e.code === 'EBUSY' || e.code === 'EPERM') {
        console.error(
          [
            '',
            '[copy-widget] dist/timekeeper-widget.exe 가 실행 중이라 빌드할 수 없어요.',
            '  dist 는 빌드할 때마다 지워지는 폴더예요. 위젯은 다른 폴더(예: C:\\Tools)에 복사해서 실행해 주세요.',
            '  1) 트레이의 위젯 아이콘 우클릭 › 종료',
            '  2) 빌드 다시 실행',
            '',
          ].join('\n')
        );
        process.exit(1);
      }
    }
  }
  process.exit(0);
}
const EXE_RE = /^TimeKeeper-캘린더-위젯-(\d+)\.(\d+)\.(\d+)\.exe$/;

const found = fs.existsSync(from_dir)
  ? fs
      .readdirSync(from_dir)
      .map((f) => ({ f, m: EXE_RE.exec(f) }))
      .filter((x) => x.m)
      .map(({ f, m }) => ({ f, v: m.slice(1).map(Number) }))
      .sort((a, b) => b.v[0] - a.v[0] || b.v[1] - a.v[1] || b.v[2] - a.v[2])
  : [];

if (!found.length) {
  console.warn('[copy-widget] desktop-widget/dist 에 위젯 exe 가 없어 건너뜁니다 (cd desktop-widget; npm run dist)');
  process.exit(0);
}
const { f, v } = found[0];
const src = path.join(from_dir, f);
const size = fs.statSync(src).size;
fs.mkdirSync(out_dir, { recursive: true });
fs.copyFileSync(src, path.join(out_dir, 'timekeeper-widget.exe'));
fs.writeFileSync(path.join(out_dir, 'timekeeper-widget.json'), JSON.stringify({ version: v.join('.'), size }));
console.log(`[copy-widget] ${f} → dist/timekeeper-widget.exe (${Math.round(size / 1024 / 1024)}MB)`);
