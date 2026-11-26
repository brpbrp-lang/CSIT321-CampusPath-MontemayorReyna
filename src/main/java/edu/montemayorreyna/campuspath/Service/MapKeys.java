package edu.montemayorreyna.campuspath.Service;

import java.util.List;
import java.util.Locale;

/**
 * The buildings drawn on the campus map (static/js/map.js uses the same ids).
 * A Location's mapKey must be one of these, so the frontend can place it on the map.
 */
public final class MapKeys {

    // Same ids as BUILDINGS in static/js/map.js (codes from the CIT-U Campus Directory sign)
    public static final List<String> ALL = List.of(
            "nge",          // B1  Dr. Nicolas G. Escario Sr. Building
            "rtl",          // B2  Don Rodolfo T. Lizares Sr. Building
            "lrac",         // B3  Learning Resource and Activity Center
            "trooms",       // B4  T-Rooms
            "satcanteen",   // B5  Satellite School Canteen
            "allied",       // B6  Allied Engineering Building
            "chem",         // B7  Chemical Engineering Building
            "power",        // B7a Electrical Power House
            "mech",         // B8  Mechanical Engineering Building
            "sal",          // B9  Don Simplicio A. Lizares Sr. Building
            "mining",       // B10 Mining Engineering Building
            "gym",          // B11 School Gymnasium
            "elemcenter",   // B12 Elementary Pupils Activity Center
            "elem",         // B13 Elementary Department Building
            "elemoffice",   // B15/B16 Elementary Guidance & Office
            "acad",         // B17 New Academic Building
            "canteen",      // B18 Main School Canteen
            "court",        // B19 Covered Court
            "lecture",      // B20 Lecture Rooms
            "dressing",     // B21 PE Dressing Room
            "gate",         // B22 Front Gate (main entrance)
            "foodlab",      // B23 Food Innovation Center
            "hscanteen",    // B24 High School Canteen
            "pe",           // B25 P.E. Activity Area
            "backgate",     // B26-B28 Back Gate & parking
            "athletes",     // B29 Athletes' Quarters
            "gphyslab",     // B33 Physics Laboratories
            "gle",          // B34 Gregorio L. Escario Building
            "busgarage",    // B36 School Bus Garage
            "elemcanteen",  // B38 Elementary Canteen
            "annex",        // B39 Backgate Annex Rooms
            "pavilion",     // B42 Sports Pavilion
            "maint");       // B40/B41/B43 Maintenance areas

    private MapKeys() {
    }

    public static boolean isValid(String key) {
        return key != null && ALL.contains(key);
    }

    /** Normalises user input: blank -> null, otherwise lower-case and checked against ALL. */
    public static String normalize(String key) {
        if (key == null || key.isBlank()) return null;
        String k = key.trim().toLowerCase(Locale.ROOT);
        if (!isValid(k)) {
            throw ApiException.badRequest("mapKey must be one of " + ALL);
        }
        return k;
    }

    /**
     * Best guess from a name/description, used once to fill in mapKey for older rows
     * that were inserted before the column existed (e.g. from dummy_data.md).
     */
    public static String guess(String name, String description) {
        String n = (name == null ? "" : name).toLowerCase(Locale.ROOT);
        String text = (n + " " + (description == null ? "" : description)).toLowerCase(Locale.ROOT);
        if (n.contains("nge") || n.contains("ccs")) return "nge";
        if (n.contains("rtl") || n.matches(".*\\b(fao|eto|oas|gdnc)\\b.*")) return "rtl";
        if (n.contains("gle")) return "gle";
        if (n.contains("acad")) return "acad";
        if (n.contains("lrac") || n.contains("library")) return "lrac";
        if (n.contains("physlab")) return "gphyslab";
        if (n.contains("sal") || n.contains("link")) return "sal";
        if (n.contains("allied")) return "allied";
        if (n.contains("elem")) return "elem";
        if (n.contains("p.e") || n.contains("pe area")) return "pe";
        if (n.contains("gym")) return "gym";
        if (text.contains("rtl building")) return "rtl";
        if (text.contains("nge building")) return "nge";
        if (n.contains("gate") || n.contains("entrance")) return "gate";
        return null;
    }
}
