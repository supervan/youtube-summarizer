import type { Route } from "./+types/home";
import { Link } from "react-router";
import LauncherGrid from "../components/LauncherGrid";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "SuperVan Digital | Video Intelligence, Digested" },
    { name: "description", content: "Transform long-form video content into professional summaries, mind maps, and quizzes." },
  ];
}

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <div className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-slate-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Video Intelligence,</span>
                  <span className="block text-indigo-600 xl:inline">Digested.</span>
                </h1>
                <p className="mt-3 text-base text-slate-600 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Transform long-form video content into professional summaries, mind maps, and quizzes in
                  seconds. Analyze captions, test your knowledge, and visualize relationships without watching
                  hours of footage.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <a href="#apps"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg">
                      View Apps
                    </a>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <a href="#features"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg">
                      Learn More
                    </a>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      <LauncherGrid />

      {/* Features Section */}
      <div id="features" className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Capabilities</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              A comprehensive suite for video analysis
            </p>
            <p className="mt-4 max-w-2xl text-xl text-slate-600 lg:mx-auto">
              Our platform leverages advanced Large Language Models (LLMs) to process video captions and extract
              high-value insights.
            </p>
          </div>

          <div className="mt-10">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">

              {/* Feature 1 */}
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1 -2 -2V5a2 2 0 0 1 2 -2h5.586a1 1 0 0 1 .707 .293l5.414 5.414a1 1 0 0 1 .293 .707V19a2 2 0 0 1 -2 2z">
                      </path>
                    </svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-slate-900">AI-Powered Summaries</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-slate-600">
                  Stop wasting time scrubbing through 2-hour long podcasts or lectures. Our AI analyzes the
                  entire transcript to generate concise, readable summaries. You can even customize the output
                  tone—choose "Professional" for business reports or "Witty" for a more engaging read. The
                  engine identifies key points, timestamps, and actionable takeaways, ensuring you get the
                  core value without the fluff.
                </dd>
              </div>

              {/* Feature 2 */}
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M12 2v20M2 12h20"></path>
                    </svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-slate-900">Interactive Mind Maps</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-slate-600">
                  Visual learners rejoice. We automatically convert linear video content into structured,
                  interactive Mind Maps using Mermaid.js technology. This allows you to see the hierarchical
                  relationship between concepts, making it perfect for understanding complex tutorials or
                  educational material. You can zoom, pan, and export these maps as SVGs for your own notes or
                  presentations.
                </dd>
              </div>

              {/* Feature 3 */}
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-slate-900">Active Recall Quizzes</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-slate-600">
                  Passive watching is the enemy of retention. Our system generates dynamic quizzes based on
                  the video content to test your understanding immediately. By engaging in "Active Recall,"
                  you reinforce the knowledge pathways in your brain, moving information from short-term to
                  long-term memory. Perfect for students preparing for exams or professionals learning new
                  skills.
                </dd>
              </div>

              {/* Feature 4 */}
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z">
                      </path>
                    </svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-slate-900">Chat-to-Video Interface</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-slate-600">
                  Have a specific question about the video? Don't search; just ask. Our "Chat with Video"
                  feature allows you to query the content using natural language. It performs a semantic
                  search across the transcript to find the exact answer you need. Whether you're looking for a
                  specific quote, a definition, or a clarification of a complex topic, the AI provides
                  instant, context-aware responses.
                </dd>
              </div>

            </dl>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-slate-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-8">
            {/* FAQ 1 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-slate-900">Does SuperVan download the actual video files?</h3>
              <p className="mt-3 text-base text-slate-600">
                No. Our service operates strictly by analyzing the public caption tracks (subtitles) provided by
                YouTube. We do not download, cache, storage, or redistribute video or audio files. This ensures
                we remain lightweight and fully compliant with content usage policies.
              </p>
            </div>
            {/* FAQ 2 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-slate-900">Is this tool free to use?</h3>
              <p className="mt-3 text-base text-slate-600">
                Yes! The core functionality available at digest.supervan.uk is currently free to use. We rely on
                standard ad-supported revenue to maintain our servers and API costs. We believe in democratizing
                access to educational tools.
              </p>
            </div>
            {/* FAQ 3 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-slate-900">How accurate are the AI summaries?</h3>
              <p className="mt-3 text-base text-slate-600">
                We use state-of-the-art Large Language Models (LLMs) to process text. While
                highly accurate, the quality of the summary depends on the quality of the original video
                captions. Validating important information with the original source is always recommended.
              </p>
            </div>
            {/* FAQ 4 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-slate-900">Can I use this for private or unlisted videos?</h3>
              <p className="mt-3 text-base text-slate-600">
                Our tool is designed for public YouTube content. We do not attempt to bypass privacy settings,
                authentication walls, or DRM. If a video is unlisted but you have the link, it may work
                depending on caption availability, but private videos are not accessible.
              </p>
            </div>
            {/* FAQ 5 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-slate-900">Do you store my chat data?</h3>
              <p className="mt-3 text-base text-slate-600">
                Summaries and chat sessions are generated in real-time for your active session. We do not build
                permanent profiles of your usage or store your chat queries long-term. Please review our Privacy
                Policy for detailed data practices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
