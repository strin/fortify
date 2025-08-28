const LoadingDots = ({ color = "bg-black" }: { color?: string }) => {
  return (
    <span className="inline-flex space-x-1">
      <span
        className={`w-2 h-2 rounded-full animate-bounce ${color}`}
        style={{ animationDelay: "0.1s" }}
      />
      <span
        className={`w-2 h-2 rounded-full animate-bounce ${color}`}
        style={{ animationDelay: "0.2s" }}
      />
      <span
        className={`w-2 h-2 rounded-full animate-bounce ${color}`}
        style={{ animationDelay: "0.3s" }}
      />
    </span>
  );
};

export default LoadingDots;
