import { useParams } from "@tanstack/react-router";
import { HostRoom } from "../components/HostRoom.tsrx";

export component HostPage() {
  const { category } = useParams({ from: "/host/$category" });

  <HostRoom category={category} />
}
