package type.union;

/**
 * Defines values for GetResponseProp1.
 */
public enum GetResponseProp1 {
    /**
     * Enum value 1.1.
     */
    ONE_ONE(1.1),

    /**
     * Enum value 2.2.
     */
    TWO_TWO(2.2),

    /**
     * Enum value 3.3.
     */
    THREE_THREE(3.3);

    /**
     * The actual serialized value for a GetResponseProp1 instance.
     */
    private final double value;

    GetResponseProp1(double value) {
        this.value = value;
    }

    /**
     * Parses a serialized value to a GetResponseProp1 instance.
     * 
     * @param value the serialized value to parse.
     * @return the parsed GetResponseProp1 object, or null if unable to parse.
     */
    public static GetResponseProp1 fromDouble(double value) {
        GetResponseProp1[] items = GetResponseProp1.values();
        for (GetResponseProp1 item : items) {
            if (Double.doubleToLongBits(item.toDouble()) == Double.doubleToLongBits(value)) {
                return item;
            }
        }
        return null;
    }

    /**
     * De-serializes the instance to double value.
     * 
     * @return the double value.
     */
    public double toDouble() {
        return this.value;
    }
}
