"use client";

import { motion } from "framer-motion";

interface AuthCardProps {
  children: React.ReactNode;
}

const AuthCard: React.FC<AuthCardProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        damping: 30,
        stiffness: 300,
        duration: 0.4,
      }}
      className="absolute bottom-0 w-full bg-white-blackAndWhite-white p-5 rounded-t-[30px] "
    >
      {children}
    </motion.div>
  );
};

export default AuthCard;
