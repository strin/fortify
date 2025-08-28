import { ArrowDownRight } from "lucide-react";

function LoginBanner() {
  return (
    <div className="absolute top-3 left-0 right-0 flex justify-center z-50">
      <div className="max-w-2xl bg-background flex items-center gap-3 text-foreground py-10 px-8 rounded-xl">
        <div className="flex flex-col items-start justify-between">
          <span className="block">To get more personalized responses</span>
          <p className="text-blue-900">
            <span
              className="cursor-pointer"
              onClick={() => (window.location.href = "/login")}
            >
              Sign in
            </span>
            /
            <span
              className="cursor-pointer"
              onClick={() => (window.location.href = "/signup")}
            >
              Sign up now
            </span>
          </p>
        </div>
        <ArrowDownRight className="text-muted-foreground" size={24} />
      </div>
    </div>
  );
}

export default LoginBanner;
