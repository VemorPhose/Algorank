import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useAnimation } from "framer-motion";
import {
  CheckCircle,
  Code,
  Trophy,
  Users,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6 lg:px-8 xl:px-12 min-w-full">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:gap-16">
              <motion.div
                className="flex flex-col justify-center space-y-4"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="space-y-2">
                  <Badge className="inline-block" variant="outline">
                    New Platform Launch
                  </Badge>
                  <h1 className="text-3xl font-sans tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                    Master Algorithms. Solve Problems. Win Contests.
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Join the premier competitive programming platform where you
                    can practice, compete, and rise through the ranks.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link to="/problems">
                      Start Coding
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/contests">View Contests</Link>
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>1000+ Problems</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Weekly Contests</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Global Leaderboard</span>
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <CodeEditorAnimation />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <FeaturesSection />

        {/* Stats Section */}
        <StatsSection />

        {/* CTA Section */}
        <CTASection />
      </div>
      <Footer />
    </div>
  );
}

// Animated Code Editor Component
function CodeEditorAnimation() {
  return (
    <div className="relative w-full max-w-[600px] rounded-xl border bg-background p-2 shadow-xl">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex space-x-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500"></div>
          <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
        </div>
        <div className="text-xs font-medium">problem.py</div>
        <div className="w-4"></div>
      </div>
      <div className="mt-4 space-y-2 overflow-hidden font-mono text-sm">
        <motion.div
          className="text-green-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          # Two Sum Problem
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          def two_sum(nums, target):
        </motion.div>
        <motion.div
          className="pl-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          hash_map = {}
        </motion.div>
        <motion.div
          className="pl-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          for i, num in enumerate(nums):
        </motion.div>
        <motion.div
          className="pl-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7 }}
        >
          complement = target - num
        </motion.div>
        <motion.div
          className="pl-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.0 }}
        >
          if complement in hash_map:
        </motion.div>
        <motion.div
          className="pl-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.3 }}
        >
          return [hash_map[complement], i]
        </motion.div>
        <motion.div
          className="pl-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6 }}
        >
          hash_map[num] = i
        </motion.div>
        <motion.div
          className="pl-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.9 }}
        >
          return []
        </motion.div>
      </div>
      <motion.div
        className="mt-4 rounded bg-green-100 p-2 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.2 }}
      >
        ✓ All test cases passed! Runtime: 56ms, faster than 95% of submissions.
      </motion.div>
    </div>
  );
}

// Features Section Component
function FeaturesSection() {
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [controls, isInView]);

  const features = [
    {
      icon: <Code className="h-10 w-10 text-primary" />,
      title: "Diverse Problem Set",
      description:
        "Access over 1,000 coding problems across various difficulty levels and topics.",
    },
    {
      icon: <Trophy className="h-10 w-10 text-primary" />,
      title: "Weekly Contests",
      description:
        "Participate in regular coding competitions to test your skills against others.",
    },
    {
      icon: <Users className="h-10 w-10 text-primary" />,
      title: "Global Community",
      description:
        "Connect with programmers worldwide, share solutions, and learn together.",
    },
    {
      icon: <Zap className="h-10 w-10 text-primary" />,
      title: "Real-time Feedback",
      description:
        "Get instant feedback on your code with detailed performance metrics.",
    },
  ];

  return (
    <section ref={ref} className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
      <div className="container px-4 md:px-6 min-w-full">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-sans tracking-tighter sm:text-5xl">
              Features that set us apart
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Everything you need to become a better programmer and ace your
              coding interviews.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mt-12">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              initial="hidden"
              animate={controls}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center space-y-4 rounded-lg border p-6 shadow-sm"
            >
              <div className="rounded-full bg-primary/10 p-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-sans">{feature.title}</h3>
              <p className="text-center text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Stats Section Component
function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const stats = [
    { value: "1M+", label: "Problems Solved" },
    { value: "100K+", label: "Active Users" },
    { value: "1000+", label: "Coding Problems" },
    { value: "150+", label: "Countries" },
  ];

  return (
    <section ref={ref} className="w-full py-12 md:py-24">
      <div className="container px-4 md:px-6 lg:px-16 min-w-full">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={
                isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }
              }
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center justify-center space-y-2 text-center"
            >
              <div className="text-3xl font-sans sm:text-4xl md:text-5xl">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-muted-foreground sm:text-base">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section Component
function CTASection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-primary/5">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-sans tracking-tighter sm:text-4xl md:text-5xl">
              Ready to start coding?
            </h2>
            <p className="max-w-[600px] text-muted-foreground md:text-xl">
              Join thousands of developers who are already improving their
              skills with AlgoRank.
            </p>
          </div>
          <div className="flex flex-col gap-2 min-[400px]:flex-row">
            <Button size="lg" asChild>
              <Link to="/problems">
                Start Coding
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/contests">View Contests</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Home;
