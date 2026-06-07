import { notFound } from "next/navigation";
import { LEGAL_DOCUMENTS } from "../../data/legalDocuments";
import LegalDocumentPage from "../../components/LegalDocumentPage";
import { getLegalDocumentContent } from "../../lib/legalContent";

export function generateStaticParams() {
  return LEGAL_DOCUMENTS.map((document) => ({ slug: document.slug }));
}

export default async function LegalDocumentRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const document = await getLegalDocumentContent(slug);

  if (!document) notFound();

  return <LegalDocumentPage document={document} />;
}
