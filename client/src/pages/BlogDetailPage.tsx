import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, User, Calendar, Share2, BookOpen } from "lucide-react";
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
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="h-64 bg-slate-200 animate-pulse rounded-2xl mb-6" />
        <div className="h-8 bg-slate-200 animate-pulse rounded-lg w-3/4 mb-4" />
        <div className="h-4 bg-slate-200 animate-pulse rounded-lg w-1/2" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Article Not Found</h2>
        <Link to="/blog" className="text-xs font-bold text-sky-700 hover:underline">
          Return to Blog Directory →
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-6"
        >
          <ArrowLeft size={15} />
          <span>Back to Clinical Resources</span>
        </Link>

        <article className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6">
          <div className="space-y-3">
            <span className="px-2.5 py-1 text-3xs font-extrabold uppercase bg-sky-50 text-sky-800 rounded-md border border-sky-200">
              {blog.category}
            </span>
            <h1 className="text-2xl sm:text-3.5xl font-black text-slate-900 tracking-tight leading-snug">
              {blog.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-b border-slate-100 pb-4">
              <span className="font-semibold text-slate-700">{blog.author}</span>
              <span>•</span>
              <span>{blog.date}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock size={13} /> {blog.readTime}
              </span>
            </div>
          </div>

          <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200">
            <img src={blog.image} alt={blog.title} className="w-full h-full object-cover" />
          </div>

          <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed space-y-4 text-slate-700">
            <p className="font-semibold text-slate-900 leading-relaxed text-sm">
              {blog.excerpt}
            </p>
            <div className="whitespace-pre-line">
              {blog.content}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/request-quote"
              className="text-xs font-bold text-sky-700 hover:underline"
            >
              Inquire about Equipment Mentioned in this Guide →
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
};
