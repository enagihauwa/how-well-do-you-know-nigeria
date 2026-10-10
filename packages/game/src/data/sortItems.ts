import type { SortItem } from "../modes/sortAm";

// SAMPLE DATA for building the game. Each order should be checked against a source before launch.
export const sortItems: SortItem[] = [
  {
    id: "sort-001",
    prompt: "Oldest first",
    order: ["Amalgamation", "Independence", "Civil War begins", "Fourth Republic begins"],
  },
  {
    id: "sort-002",
    prompt: "Oldest first",
    order: ["Naira introduced", "FESTAC '77", "Capital moves to Abuja", "Olympic football gold"],
  },
  {
    id: "sort-003",
    prompt: "These states, north to south",
    order: ["Katsina", "Kaduna", "Kogi", "Delta"],
  },
  {
    id: "sort-004",
    prompt: "These states, north to south",
    order: ["Borno", "Adamawa", "Benue", "Cross River"],
  },
  {
    id: "sort-005",
    prompt: "These cities, north to south",
    order: ["Kano", "Abuja", "Ibadan", "Lagos"],
  },
  {
    id: "sort-006",
    prompt: "These cities, west to east",
    order: ["Lagos", "Benin City", "Onitsha", "Calabar"],
  },
  {
    id: "sort-007",
    prompt: "Who led Nigeria first? Earliest first",
    order: ["Tafawa Balewa", "Yakubu Gowon", "Shehu Shagari", "Ibrahim Babangida"],
  },
  {
    id: "sort-008",
    prompt: "Presidents, earliest first",
    order: ["Umaru Yar'Adua", "Goodluck Jonathan", "Muhammadu Buhari", "Bola Tinubu"],
  },
  {
    id: "sort-009",
    prompt: "Novels, earliest published first",
    order: ["Things Fall Apart", "Arrow of God", "Half of a Yellow Sun", "Americanah"],
  },
  {
    id: "sort-010",
    prompt: "Naira notes, smallest to biggest",
    order: ["₦20", "₦100", "₦500", "₦1000"],
  },
];
