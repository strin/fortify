import { Creator } from "@/types";
import { motion } from "framer-motion";
import UserCard from "./UserCard";

interface ICategorySection {
  category: string;
  creators: Creator[];
}

export default function CategorySection({
  category,
  creators,
}: ICategorySection) {
  if (creators.length === 0) return null;

  return (
    <motion.li
      className="overflow-hidden flex-shrink-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-col gap-4 py-3 px-0">
        <h2 className="text-xl font-medium">{category}</h2>
        <ul className="flex space-x-6 overflow-x-auto scrollbar-hide">
          {creators.map((creator) => (
            <motion.li
              key={creator.id}
              className="overflow-hidden flex-shrink-0"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <UserCard creator={creator} />
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.li>
  );
}
