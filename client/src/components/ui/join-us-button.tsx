import GitHubIcon from "@mui/icons-material/GitHub";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export default function JoinUsButton() {
  return (
    <Link href="https://devsarena.in/login" >
    <Button  size="sm" className="h-10 rounded-xl px-4 gap-2 cursor-pointer">
      <GitHubIcon fontSize="small" />
      Get Started
    </Button>
    </Link>
  );
}
