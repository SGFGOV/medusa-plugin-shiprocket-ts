export * as response from "./response";
export * as country from "./country";

export function incDay(date: Date, n: number): string {
    const fudate = new Date(
        new Date(date).setDate(new Date(date).getDate() + n)
    );
    const strDate =
        fudate.getFullYear() +
        "-" +
        (fudate.getMonth() + 1) +
        "-" +
        fudate.toDateString().substring(8, 10);
    return strDate;
}
