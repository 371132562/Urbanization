'use client'

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-700" />

      {/* Floating Decorative Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* 线条形式动画 */}
        <div
          className="animate-slide-horizontal absolute left-16 top-16 h-1 w-32 bg-white/10"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="animate-wave-vertical absolute right-24 top-80 h-24 w-1 bg-cyan-300/15"
          style={{ animationDuration: '6s' }}
        />
        <div
          className="bg-blue-300/12 animate-glow-pulse absolute bottom-32 left-1/4 h-0.5 w-20 rotate-45"
          style={{ animationDuration: '5s' }}
        />

        {/* 圆形式动画 */}
        <div
          className="bg-white/8 animate-scale-bounce absolute right-32 top-24 h-16 w-16 rounded-full"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="animate-orbit absolute bottom-48 left-32 h-12 w-12 rounded-full bg-cyan-200/10"
          style={{ animationDuration: '12s' }}
        />
        <div
          className="animate-breathe absolute right-1/3 top-2/3 h-8 w-8 rounded-full bg-blue-200/15"
          style={{ animationDuration: '4s' }}
        />

        {/* 三角形式动画 */}
        <div
          className="left-1/5 border-b-12 animate-wobble-spin absolute top-48 h-0 w-0 border-l-8 border-r-8 border-b-white/10 border-l-transparent border-r-transparent"
          style={{ animationDuration: '15s' }}
        />
        <div
          className="border-l-6 border-r-6 border-b-10 border-b-cyan-300/12 animate-pendulum absolute bottom-16 right-48 h-0 w-0 border-l-transparent border-r-transparent"
          style={{ animationDuration: '9s' }}
        />
        <div
          className="right-2/5 border-b-blue-400/8 animate-flip-fade absolute top-12 h-0 w-0 border-b-8 border-l-4 border-r-4 border-l-transparent border-r-transparent"
          style={{ animationDuration: '6s' }}
        />

        {/* 圆环形式动画 */}
        <div
          className="left-2/5 border-white/12 animate-ellipse-rotate absolute top-40 h-20 w-20 rounded-full border-2"
          style={{ animationDuration: '12s' }}
        />
        <div
          className="right-1/5 animate-pulse-scale absolute bottom-40 h-16 w-16 rounded-full border-2 border-cyan-300/15"
          style={{ animationDuration: '10s' }}
        />
        <div
          className="animate-spiral absolute left-3/4 top-1/3 h-12 w-12 rounded-full border border-blue-200/10"
          style={{ animationDuration: '14s' }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-8">
        <div className="overflow-hidden rounded-2xl border-0 bg-transparent shadow-2xl">
          <div className="flex min-h-[600px]">
            {/* Left Side - Product Information with Glass Effect */}
            <div className="relative hidden lg:flex lg:w-1/2">
              {/* Background Pattern */}
              <div className="absolute inset-0 overflow-hidden border-r border-white/20 bg-white/10 backdrop-blur-md">
                <div className="absolute inset-0 opacity-10">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' strokeWidth='1' strokeOpacity='0.3'%3E%3Crect x='0' y='0' width='80' height='80'/%3E%3Cline x1='0' y1='40' x2='80' y2='40'/%3E%3Cline x1='40' y1='0' x2='40' y2='80'/%3E%3C/g%3E%3C/svg%3E")`
                    }}
                  />
                </div>
              </div>

              <div className="relative z-10 flex flex-col justify-center px-12 text-white">
                <div className="mb-8">
                  <svg
                    className="h-16 w-16 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>

                {/* Main Title */}
                <h1 className="mb-4 text-4xl font-bold leading-tight">智能数据管理平台</h1>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex w-full items-center justify-center rounded-r-2xl bg-white p-8 lg:w-1/2">
              <div className="w-full max-w-md">
                {/* Welcome Header */}
                <div className="mb-8 text-center">
                  <h2 className="mb-2 text-3xl font-bold text-gray-900">欢迎回来</h2>
                </div>

                <form className="space-y-6">
                  {/* Username Field */}
                  <div className="space-y-2">
                    <label
                      htmlFor="username"
                      className="text-sm font-medium text-gray-700"
                    >
                      用户编号
                    </label>
                    <div className="relative">
                      <input
                        id="username"
                        type="text"
                        placeholder="请输入用户编号"
                        className="h-12 w-full rounded-md border border-gray-300 pl-10 pr-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <svg
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-gray-700"
                    >
                      密码
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type="password"
                        placeholder="请输入密码"
                        className="h-12 w-full rounded-md border border-gray-300 pl-10 pr-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <svg
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                      </svg>
                    </div>
                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    className="h-12 w-full rounded-md bg-gradient-to-r from-blue-600 to-cyan-600 text-base font-medium text-white transition-colors duration-200 hover:from-blue-700 hover:to-cyan-700"
                  >
                    登录
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS Animation Styles */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }

        @keyframes float-delayed {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(-180deg);
          }
        }

        @keyframes slide-horizontal {
          0% {
            transform: translateX(-100px) scaleX(0.5);
            opacity: 0.3;
          }
          50% {
            transform: translateX(50px) scaleX(1.2);
            opacity: 0.8;
          }
          100% {
            transform: translateX(-100px) scaleX(0.5);
            opacity: 0.3;
          }
        }

        @keyframes wave-vertical {
          0%,
          100% {
            transform: translateY(0px) scaleY(1);
          }
          25% {
            transform: translateY(-30px) scaleY(1.5);
          }
          75% {
            transform: translateY(30px) scaleY(0.7);
          }
        }

        @keyframes glow-pulse {
          0%,
          100% {
            opacity: 0.3;
            box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
          }
        }

        @keyframes scale-bounce {
          0%,
          100% {
            transform: scale(1) translateY(0px);
          }
          25% {
            transform: scale(1.3) translateY(-10px);
          }
          50% {
            transform: scale(0.8) translateY(5px);
          }
          75% {
            transform: scale(1.1) translateY(-5px);
          }
        }

        @keyframes orbit {
          0% {
            transform: rotate(0deg) translateX(40px) rotate(0deg);
          }
          100% {
            transform: rotate(360deg) translateX(40px) rotate(-360deg);
          }
        }

        @keyframes breathe {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.8);
            opacity: 0.1;
          }
        }

        @keyframes wobble-spin {
          0% {
            transform: rotate(0deg) scale(1);
          }
          25% {
            transform: rotate(90deg) scale(1.2);
          }
          50% {
            transform: rotate(180deg) scale(0.8);
          }
          75% {
            transform: rotate(270deg) scale(1.1);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }

        @keyframes pendulum {
          0%,
          100% {
            transform: rotate(-15deg) translateY(0px);
          }
          50% {
            transform: rotate(15deg) translateY(-20px);
          }
        }

        @keyframes flip-fade {
          0%,
          100% {
            transform: rotateY(0deg);
            opacity: 0.4;
          }
          50% {
            transform: rotateY(180deg);
            opacity: 0.8;
          }
        }

        @keyframes ellipse-rotate {
          0% {
            transform: rotate(0deg) scaleX(1) scaleY(0.5);
          }
          50% {
            transform: rotate(180deg) scaleX(0.7) scaleY(1.2);
          }
          100% {
            transform: rotate(360deg) scaleX(1) scaleY(0.5);
          }
        }

        @keyframes pulse-scale {
          0%,
          100% {
            transform: scale(1);
            border-width: 2px;
          }
          50% {
            transform: scale(1.5);
            border-width: 1px;
          }
        }

        @keyframes spiral {
          0% {
            transform: rotate(0deg) translateX(0px) scale(1);
          }
          25% {
            transform: rotate(90deg) translateX(20px) scale(1.2);
          }
          50% {
            transform: rotate(180deg) translateX(0px) scale(0.8);
          }
          75% {
            transform: rotate(270deg) translateX(-20px) scale(1.1);
          }
          100% {
            transform: rotate(360deg) translateX(0px) scale(1);
          }
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-slide-horizontal {
          animation: slide-horizontal 8s ease-in-out infinite;
        }

        .animate-wave-vertical {
          animation: wave-vertical 6s ease-in-out infinite;
        }

        .animate-glow-pulse {
          animation: glow-pulse 5s ease-in-out infinite;
        }

        .animate-scale-bounce {
          animation: scale-bounce 8s ease-in-out infinite;
        }

        .animate-orbit {
          animation: orbit 12s linear infinite;
        }

        .animate-breathe {
          animation: breathe 4s ease-in-out infinite;
        }

        .animate-wobble-spin {
          animation: wobble-spin 15s ease-in-out infinite;
        }

        .animate-pendulum {
          animation: pendulum 9s ease-in-out infinite;
        }

        .animate-flip-fade {
          animation: flip-fade 6s ease-in-out infinite;
        }

        .animate-ellipse-rotate {
          animation: ellipse-rotate 12s ease-in-out infinite;
        }

        .animate-pulse-scale {
          animation: pulse-scale 10s ease-in-out infinite;
        }

        .animate-spiral {
          animation: spiral 14s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
