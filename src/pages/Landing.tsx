import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MaterialCard } from "@/components/ui/material-card";
import { LokYodhaLogo } from "@/components/LokYodhaLogo";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { useState } from "react";
import { 
  Users, 
  TrendingUp, 
  Award, 
  BookOpen, 
  Target,
  ArrowRight,
  CheckCircle,
  Star,
  Zap,
  Shield,
  Crown,
  MessageCircle
} from "lucide-react";
import { Chatbot } from "@/components/Chatbot";

export default function Landing() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);

  const features = [
    {
      icon: Target,
      title: "AI-Powered Gap Analysis",
      description: "Intelligent assessment of skills gaps with personalized development recommendations",
      color: "text-primary"
    },
    {
      icon: TrendingUp,
      title: "9-Box Performance Matrix",
      description: "Visual performance-potential mapping for strategic succession planning",
      color: "text-emerald-600"
    },
    {
      icon: BookOpen,
      title: "Personalized Learning Paths",
      description: "Curated development programs tailored to individual career aspirations",
      color: "text-amber-600"
    },
    {
      icon: Users,
      title: "Smart Mentorship Matching",
      description: "AI-driven mentor-mentee pairing based on skills and career goals",
      color: "text-blue-600"
    },
    {
      icon: Award,
      title: "Achievement Tracking",
      description: "Gamified progress tracking with badges and milestone celebrations",
      color: "text-purple-600"
    },
    {
      icon: Zap,
      title: "Real-time Analytics",
      description: "Executive dashboards with succession pipeline health metrics",
      color: "text-red-600"
    }
  ];

  const stats = [
    { number: "95%", label: "Employee Engagement", icon: Star },
    { number: "3x", label: "Faster Development", icon: Zap },
    { number: "99.99%", label: "Succession Readiness", icon: Shield },
    { number: "24/7", label: "AI-Powered Support", icon: Crown }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <LokYodhaLogo size="md" minimal animated />
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost"
                onClick={() => setChatOpen(true)}
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="hidden sm:inline">Chat</span>
              </Button>
              {isAuthenticated ? (
                <Button 
                  onClick={() => navigate("/dashboard")}
                  className="bg-primary hover:bg-primary/90"
                >
                  Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate("/auth")}
                  className="bg-primary hover:bg-primary/90"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <LokYodhaLogo size="lg" className="justify-center mb-8" minimal animated />
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Next‑Gen
                <span className="bg-gradient-to-r from-primary via-amber-500 to-emerald-500 bg-clip-text text-transparent">
                  {" "}Succession Planning
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                Transform your organization's leadership development with intelligent gap analysis, 
                personalized learning paths, and data-driven succession planning.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <Button 
                size="lg" 
                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
                className="bg-primary hover:bg-primary/90 text-lg px-8 py-4 h-auto"
              >
                {isAuthenticated ? "Go to Dashboard" : "Start Free Trial"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => window.open("https://youtube.com/shorts/OtiK6CPSza4?si=d9HIm6ibJZxIc1O2", "_blank")}
                className="text-lg px-8 py-4 h-auto border-2"
              >
                Watch Demo
              </Button>
            </motion.div>

            {/* Hero Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {stats.map((stat, index) => (
                <MaterialCard key={index} elevation={2} className="p-6 text-center">
                  <div className="flex justify-center mb-3">
                    <stat.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.number}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </MaterialCard>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Leadership Development Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to identify, develop, and retain top talent in your organization.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <MaterialCard elevation={2} interactive className="p-8 h-full hover:shadow-lg transition-all duration-300">
                  <div className={`p-3 rounded-full w-fit mb-6 ${feature.color.replace('text-', 'bg-')}/10`}>
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </MaterialCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-emerald-500/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Organizations Choose LokYodha
              </h2>
              <div className="space-y-6">
                {[
                  "Reduce leadership gaps by 75% with predictive analytics",
                  "Accelerate development timelines by 3x with AI recommendations", 
                  "Increase employee engagement through personalized growth paths",
                  "Ensure business continuity with robust succession pipelines"
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start space-x-4"
                  >
                    <CheckCircle className="h-6 w-6 text-emerald-500 mt-1 flex-shrink-0" />
                    <p className="text-lg text-gray-700">{benefit}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <MaterialCard elevation={3} className="p-8">
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary mb-4">95%</div>
                  <div className="text-xl font-semibold text-gray-900 mb-2">Success Rate</div>
                  <div className="text-gray-600 mb-6">
                    Organizations report improved leadership readiness within 6 months
                  </div>
                  <Button 
                    size="lg" 
                    onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {isAuthenticated ? "Access Dashboard" : "Start Your Journey"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </MaterialCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your Succession Planning?
            </h2>
            <p className="text-xl text-primary-foreground/90 mb-8">
              Join leading organizations using LokYodha to build stronger leadership pipelines.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
                className="text-lg px-8 py-4 h-auto bg-white text-primary hover:bg-white/90 border-0"
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <LokYodhaLogo size="md" className="mb-4 md:mb-0" minimal animated light />
            <div className="text-gray-400 text-center md:text-right">
              <p>&copy; 2025 LokYodha. All rights reserved.</p>
              <p className="text-sm mt-1">
                Empowering organizations through intelligent succession planning.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Chatbot with controlled state */}
      <Chatbot source="landing" open={chatOpen} onOpenChange={setChatOpen} hideButton />
    </div>
  );
}