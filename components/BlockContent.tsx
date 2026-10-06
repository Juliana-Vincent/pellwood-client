import { BlocksRenderer, type BlocksContent } from '@strapi/blocks-react-renderer';
import { cleanUrl, isExternalUrl } from '@/helpers/externalLink';

interface BlockContentProps {
  blocks?: BlocksContent | string | null | any;
}

const BlockContent = ({ blocks }: BlockContentProps) => {
  if (!blocks) return null;

  if (typeof blocks === 'string') {
    return <p>{blocks}</p>;
  }

  const content = blocks.content || blocks;

  if (!Array.isArray(content)) {
    return null;
  }

  return (
    <BlocksRenderer
      content={content}
      blocks={{
        // Every link in CMS rich text went straight to <a href> as typed: no
        // new-window behaviour, and whatever tracking parameters were on the URL
        // when it was pasted. rel="noopener noreferrer" goes with target="_blank"
        // - without it the opened page gets a handle on this one via window.opener.
        link: ({ children, url }) => {
          const href = cleanUrl(url);
          return isExternalUrl(href) ? (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ) : (
            <a href={href}>{children}</a>
          );
        },
      }}
    />
  );
};

export default BlockContent;
