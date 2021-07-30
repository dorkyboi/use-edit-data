import React from "react";
import {validate} from "../utils/Validator";
import makeFormData from "make-form-data";

export default function useEditData({
    id, // identifier of the model, must be provided initially (on first render)
    fetch, // API method that resolves to future form's state
    submit, // API method that will be used to submit data
    defaultValues = () => ({}), // object with default values to be used on create (but not on edit (!))
    onChangeCustomizers = {}, // object with functions that overrides default onChange behaviour, have to return new state
    validators = {}, // object with validation rules
    statePreparer, // function that transforms result of "single" before it is used as form's state
    submitPreparer, // function that transforms form's state before it is submitted
    onSuccess, // function that will be called after successful saving
    onError, // function that will be called after failed saving
}) {
    const [data, setData] = React.useState(null);
    const [errors, setErrors] = React.useState(null);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (!id) {
            setData(defaultValues());
            return;
        }

        fetch(id).then(data => setData(statePreparer ? statePreparer({...data}) : data));
    }, []);

    const onChange = e => {
        const locale = e.target.dataset?.locale;
        const name = e.target.name;
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

        const newState = onChangeCustomizers[name]?.(e, {...data}) || {
            ...data,
            [name]: locale
                ? {...data[name], [locale]: value}
                : value,
        };

        setData(newState);

        // validation
        const validator = validators[name];
        if (!validator)
            return;

        const error = validator(value?.trim ? value.trim() : value, newState);
        setErrors({
            ...(errors || {}),
            [name]: locale
                ? {...(errors?.[name] || {}), [locale]: error}
                : error,
        });
    };

    const save = () => {
        setSaving(true);
        const values = {...data};

        // validate
        setErrors(null);
        const errors = validate(values, validators);
        if (errors) {
            setErrors(errors);
            setSaving(false);
            return;
        }

        // submit
        submit(makeFormData(submitPreparer ? submitPreparer(values) : values))
            .then(onSuccess)
            .catch(error => {
                onError?.(error, values);
                setSaving(false);
            });
    };

    return {data, setData, errors, setErrors, saving, onChange, save};
};
