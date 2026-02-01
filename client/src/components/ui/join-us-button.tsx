import GitHubIcon from "@mui/icons-material/GitHub";
import { Button } from "@/components/ui/button";
import {login} from "@/auth/actions"
export default function JoinUsButton() {
  return (
    <form action={login}>
    <Button  size="sm" className="h-10 rounded-xl px-4 gap-2">
      <GitHubIcon fontSize="small" />
      Join via GitHub
    </Button>
    </form>
  );
}
