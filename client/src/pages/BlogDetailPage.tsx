import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { BlogArticle } from "../types";

export const BlogDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<BlogArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBlog() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/blogs/${slug}`);
        const data = await res.json();
        if (data.success && data.blog) {
          setBlog(data.blog);
        }
      } catch (err) {
        console.error("Failed to load blog detail:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) {
      loadBlog();
      window.scrollTo(0, 0);
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24">
        <div className="h-64 bg-[#F2F2F2] animate-pulse rounded-2xl mb-6" />
        <div className="h-8 bg-[#F2F2F2] animate-pulse rounded-lg w-3/4 mb-4" />
        <div className="h-4 bg-[#F2F2F2] animate-pulse rounded-lg w-1/2" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="max-w-md mx-auto px-6 py-28 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#111111]">Article Not Found</h2>
        <Link to="/blog" className="text-xs font-semibold text-[#1F7A4D] hover:underline">
          Return to Blog Directory →
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-6">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#555555] hover:text-[#111111] mb-8 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Clinical Resources</span>
        </Link>

        <article className="bg-white rounded-2xl border border-[#EAEAEA] p-8 sm:p-12 shadow-xs space-y-8">
          <div className="space-y-4">
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-[#EAF5EF] text-[#1F7A4D] rounded-full">
              {blog.category}
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#111111] tracking-tight leading-snug">
              {blog.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#777777] pt-2 border-b border-[#EAEAEA] pb-4">
              <span className="font-semibold text-[#111111]">{blog.author}</span>
              <span>•</span>
              <span>{blog.date}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock size={13} /> {blog.readTime}
              </span>
            </div>
          </div>

          <div className="aspect-video rounded-xl overflow-hidden border border-[#EAEAEA]">
            <img src={blog.image} alt={blog.title} className="w-full h-full object-cover" />
          </div>

          <div className="prose prose-neutral max-w-none text-sm leading-relaxed space-y-5 text-[#555555]">
            <p className="font-semibold text-[#111111] leading-relaxed text-base">
              {blog.excerpt}
            </p>
            <div className="whitespace-pre-line text-[#444444] leading-relaxed">
              {blog.content}
            </div>
          </div>

          <div className="pt-8 border-t border-[#EAEAEA] flex items-center justify-between">
            <Link
              to="/request-quote"
              className="text-xs font-semibold text-[#111111] hover:text-[#1F7A4D] transition-colors"
            >
              Inquire about Equipment Mentioned in this Guide →
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
};
