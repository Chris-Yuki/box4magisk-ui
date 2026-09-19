// SectionTitle - 区块标题
// 左侧 3px 渐变竖条（indigo → violet），全大写加粗小字

interface SectionTitleProps {
  title: string;
}

export function SectionTitle({ title }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-5 px-1">
      {/* 左侧渐变竖条 */}
      <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500 shrink-0" />
      {/* 标题文字 */}
      <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider transition-colors">
        {title}
      </h3>
    </div>
  );
}
