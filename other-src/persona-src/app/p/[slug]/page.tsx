import styles from "./Post.module.css";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

// Simulated local posts data.
// Replace this with real data from a database or another CMS.
const posts = [
  {
    slug: "first-post",
    title: "My First Post",
    author: "John Doe",
    _updatedAt: "2025-02-12T08:00:00.000Z",
    _createdAt: "2025-02-12T08:00:00.000Z",
    body: `## Hello!
This is a demo post written in Markdown.
  
![Alt text for image](/path-to-image.jpg)
  
More content here...`,
  },
  // Add additional posts here...
];

// Generate static params for dynamic routing based on local data.
export async function generateStaticParams() {
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// Retrieve a post from the local data using the slug.
async function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}

// Custom renderer for Markdown images using Next.js Image component.
const components = {
  img: ({ ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    return (
      <Image
        {...props}
        src={props.src || ""}
        alt={props.alt || " "}
        width={512}  // Default width; adjust as needed
        height={512} // Default height; adjust as needed
        className={styles.postImage}
      />
    );
  },
};

export default async function Post({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);
  console.log("post", post);

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <article className="mt-8">
      <h1 className={styles.title}>{post.title}</h1>
      <p className={styles.lastUpdated}>
        Last updated:{" "}
        {new Date(post._updatedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <div className={styles.post}>
        <ReactMarkdown components={components}>{post.body}</ReactMarkdown>
      </div>
    </article>
  );
}
