import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { BlogArticle } from "../types";

export const BlogListPage: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBlogs() {
      try {
        const res = await fetch("/api/blogs");
        const data = await res.json();
        if (data.success) {
          setBlogs(data.blogs);
        }
      } catch (err) {
        console.error("Failed to load blogs:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadBlogs();
  }, []);

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF5EF] text-[#1F7A4D] text-xs font-semibold">
            <BookOpen size={13} />
            <span>Clinical Knowledge Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
            Medical Technology Guides & Clinical Resources
          </h1>
          <p className="text-sm text-[#555555] leading-relaxed">
            Insights on operating room illumination, electrosurgical generator safety, and rehabilitation physics written by practicing biomedical engineers.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-88 bg-white rounded-2xl animate-pulse border border-[#EAEAEA]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {blogs.map((b) => (
              <article
                key={b.id}
                className="group bg-white rounded-2xl border border-[#EAEAEA] overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video bg-[#F7F7F7] overflow-hidden border-b border-[#EAEAEA]">
                    <img
                      src={b.image}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6 sm:p-7 space-y-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1F7A4D] uppercase tracking-wider">
                      <span>{b.category}</span>
                      <span className="text-[#777777] font-normal flex items-center gap-1">
                        <Clock size={12} /> {b.readTime}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-[#111111] leading-snug line-clamp-2 group-hover:text-[#1F7A4D] transition-colors">
                      <Link to={`/blog/${b.slug}`}>{b.title}</Link>
                    </h2>

                    <p className="text-xs sm:text-sm text-[#555555] line-clamp-3 leading-relaxed">
                      {b.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-6 sm:p-7 pt-0 flex items-center justify-between border-t border-[#EAEAEA] mt-4 text-xs">
                  <span className="text-xs text-[#777777]">{b.date}</span>
                  <Link
                    to={`/blog/${b.slug}`}
                    className="font-semibold text-[#111111] hover:text-[#1F7A4D] flex items-center gap-1.5 transition-colors"
                  >
                    <span>Read Article</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
