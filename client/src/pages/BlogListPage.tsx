import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, User } from "lucide-react";
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
    <div className="w-full bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-900 text-3xs font-bold uppercase tracking-wider">
            <BookOpen size={14} className="text-sky-700" />
            <span>Clinical Knowledge Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Medical Technology Guides & Clinical Resources
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Insights on operating room illumination, electrosurgical generator safety, and rehabilitation physics written by practicing biomedical engineers.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-white rounded-2xl animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogs.map((b) => (
              <article
                key={b.id}
                className="group bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video bg-slate-100 overflow-hidden">
                    <img
                      src={b.image}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between text-3xs font-bold text-sky-700 uppercase tracking-wider">
                      <span>{b.category}</span>
                      <span className="text-slate-400 font-normal flex items-center gap-1">
                        <Clock size={12} /> {b.readTime}
                      </span>
                    </div>

                    <h2 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-sky-700 transition-colors">
                      <Link to={`/blog/${b.slug}`}>{b.title}</Link>
                    </h2>

                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {b.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0 flex items-center justify-between border-t border-slate-100 mt-4 text-xs">
                  <span className="text-3xs text-slate-400">{b.date}</span>
                  <Link
                    to={`/blog/${b.slug}`}
                    className="font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
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
