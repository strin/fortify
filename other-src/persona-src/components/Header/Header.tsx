"use client";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <div className="flex justify-between items-center mx-4 mb-3">
      <p className="text-3xl font-bold text-white text-center">{title}</p>
    </div>
  );
}
