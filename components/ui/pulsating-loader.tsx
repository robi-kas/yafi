import { motion } from 'framer-motion';

export default function PulsatingDots() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex space-x-2">
                <motion.div
                    className="h-4 w-4 rounded-full bg-primary"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 1,
                        ease: 'easeInOut',
                        repeat: Infinity,
                    }}
                />
                <motion.div
                    className="h-4 w-4 rounded-full bg-primary"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 1,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        delay: 0.3,
                    }}
                />
                <motion.div
                    className="h-4 w-4 rounded-full bg-primary"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 1,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        delay: 0.6,
                    }}
                />
            </div>
        </div>
    );
}
