import { redirect } from "next/navigation";

export default function Home() {
  // Immediately bypass the login screen and enter the application
  redirect("/space");
}
