import { redirect } from "next/navigation";

/** Старый маршрут → новый кабинет */
export default function MyPromptsRedirect() {
  redirect("/dashboard");
}
