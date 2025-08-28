import styles from "./LoginWithGoogle.module.css";
import { Button } from "@/components/ui/button";

export default function LoginWithGoogleButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button className={styles.login_with_google_btn} onClick={onClick}>
      Sign in with Google
    </Button>
  );
}
