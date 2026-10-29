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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF5EF] text-[#2D5A4A] text-xs font-semibold">
            <BookOpen size={13} className="text-[#7AA05A]" />
            <span>Clinical Knowledge Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
            Medical Technology Guides & Clinical Resources
          </h1>
          <p className="text-sm text-[#555555] leading-relaxed">
            Evidence-based clinical guidelines, biomedical engineering insights, and hospital procurement specifications.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-88 bg-white rounded-2xl animate-pulse border border-[#EAEAEA]" />
            ))}
          </div>
        ) : blogs.length > 0 ? (
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
                    <div className="flex items-center justify-between text-xs font-semibold text-[#2D5A4A] uppercase tracking-wider">
                      <span>{b.category}</span>
                      <span className="text-[#777777] font-normal flex items-center gap-1">
                        <Clock size={12} /> {b.readTime}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-[#111111] leading-snug line-clamp-2 group-hover:text-[#2D5A4A] transition-colors">
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
                    className="font-semibold text-[#111111] hover:text-[#2D5A4A] flex items-center gap-1.5 transition-colors"
                  >
                    <span>Read Article</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-[#EAEAEA] max-w-lg mx-auto shadow-2xs space-y-3">
            <BookOpen size={32} className="mx-auto text-[#7AA05A]" />
            <h2 className="text-base font-bold text-[#111111]">No Clinical Resources Available</h2>
            <p className="text-xs text-[#555555] max-w-sm mx-auto leading-relaxed">
              New medical technology documentation and clinical guides will be published soon.
            </p>
            <div className="pt-2">
              <Link
                to="/shop-all"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7AA05A] hover:bg-[#2D5A4A] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                <span>Explore Medical Catalogue</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
