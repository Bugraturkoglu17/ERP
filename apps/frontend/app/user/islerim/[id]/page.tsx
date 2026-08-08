import { redirect } from "next/navigation";

interface Props {
  params: { id: string };
}

export default function UserIsEmriDetail({ params }: Props) {
  redirect(`/is-emirleri/${params.id}`);
}
